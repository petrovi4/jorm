var pg = require('pg');
var extend = require('extend');

var Essence = function(meta, params, joinParams) {	
	// console.log('Create new', meta, params);
	extend(this, meta);

	for(var property in meta.fields){
		this[property] = params[property] ? params[property] : params[meta.table + '.' + property];
	}

	for(var joinIndex in joinParams){
		var join = this.getJoinParams( joinParams[joinIndex] );
		var joineEssence = new Essence(join.essence, params);
		this[join.essence.name] = [ joineEssence ];
	}

	if(this.init) this.init(params);
}

Essence.internalWhereProcess = function(meta, param, value, index) {
	var whereClause = '';
	var whereParams = [];

	// console.log('Process param', param, value);

	if( value == undefined ) return;
	if( param.indexOf('order by') != -1 ) return;
	if( param == 'join' ) return;
	if( param =='limit' ) return;

	if(value instanceof Array){
		whereClause += param + ' in (';
		for(var arrayIndex = 0; arrayIndex < value.length; arrayIndex++){
			whereClause += (arrayIndex == 0 ? '' : ', ') + '$' + index.toString();
			whereParams.push(value[arrayIndex]);
			index++;
		}
		whereClause += ')';
	}
	else if(value.comparsion && value.value){
		whereClause += '"' + param + '" ' + value.comparsion + ' $' + index.toString();
		whereParams.push(value.value);
		index++;
	}
	else if(param == 'search' && value.columns && value.value){
		for(var i=0; i < value.columns.length; i++){
			whereClause += (whereClause.length == 0 ? '(' : ' OR ') + 'LOWER("' + value.columns[i] + '") LIKE $' + index.toString();
		}
		whereClause += ')';
		whereParams.push(value.value);
		index++;
	}
	else if(param.indexOf('.') != -1){
		whereClause += param + ' = $' + index.toString();
		whereParams.push(value);
		index++;
	}
	else{
		whereClause += '"' + meta.table + '"."' + param + '" = $' + index.toString();
		whereParams.push(value);
		index++;
	}
	return {whereClause: whereClause, whereParams: whereParams, index: index};
}

Essence.getSelectFields = function() {
	var selectFields = '';
	for(var property in this.fields){
		selectFields += (selectFields.length > 0 ? ', ' : '') + '"' + this.table + '"."' + property + '" as "' + this.table + '.' + property + '"';
	}
	return selectFields;
}

Essence.getJoinParams = function(join) {
	var joinObj = (typeof join == 'string') ? {
		essence: this.jorm[join],
		field: this.jorm[join].table + '_id',
		joinField: 'id'
	} : join;

	if(typeof joinObj.essence == 'string') joinObj.essence = this.jorm[joinObj.essence];
	if(!joinObj.field) joinObj.field = joinObj.essence.table + '_id';
	if(!joinObj.joinField) joinObj.joinField = 'id';

	return joinObj;
}

Essence.get = function(params, done) {
	if(this.jorm.log) console.log('Start get', params);	

	var selectFields = this.getSelectFields();
	var tablesJoin = '';

	var whereJoinClause = '';

	var whereClause = '';
	var whereParams = [];
	var orderClause = '';
	var limitClause = '';

	var joinsCache = {};

	for(var joinIndex in params.join){
		var join = this.getJoinParams(params.join[joinIndex]);

		tablesJoin += ', "' + join.essence.table + '"';
		selectFields += ', ' + join.essence.getSelectFields();

		whereJoinClause += (whereJoinClause.length == 0 ? '': ' AND') + ' "' + this.table + '"."' + join.field + '" = "' + join.essence.table + '"."' + join.joinField + '"';
		
		joinsCache[join.essence.name] = join;
	}

	if(this.where){
		var where = this.where(params);

		if(where){
			whereClause = (where.whereClause || '');
			whereParams = (where.whereParams || []);
		}
	}

	if( whereClause.length == 0 && whereParams.length == 0 ){
		var index = 1;

		for(var whereParam in params){
			var where = null;
			if(this.whereParam){
				where = this.whereParam(params);
			}

			if(!where){
				where = Essence.internalWhereProcess(this, whereParam, params[whereParam], index);
			}

			if(where){
				whereClause += ((whereClause && whereClause.length > 0) ? ' AND' : '') + ' ' + where.whereClause;
				whereParams = whereParams.concat(where.whereParams);
				index = where.index || (index + 1);
			}
		}	
	}

	if(this.order){
		orderClause = this.order(params);
	}
	else{
		for(var whereParam in params){
			if( params[whereParam] == undefined ) continue;

			if(whereParam == 'order by asc'){
				orderClause = ' order by "' + params[whereParam] + '" asc';
			}
			else if(whereParam == 'order by desc'){
				orderClause = ' order by "' + params[whereParam] + '" desc';
			}
		}
	}

	if(this.limit){
		limitClause = this.limit(params);
	}
	else{
		for(var limitParam in params){
			if( params[limitParam] == undefined ) continue;

			if(limitParam == 'limit'){
				limitClause = ' limit ' + parseInt(params[limitParam]);
			}
		}
	}



	var _this = this;
	this.jorm.dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		var whereClauseConcat = (whereJoinClause.length > 0 || whereClause.length > 0 ? ' WHERE' : '') + whereJoinClause + (whereJoinClause.length > 0 && whereClause.length > 0 ? ' AND' : '') + whereClause;

		var queryString = 'SELECT '+ selectFields +' FROM "' + _this.table + '"' + tablesJoin + whereClauseConcat + orderClause + limitClause;

		if(_this.jorm.logSQL) console.log(queryString, whereParams);

		client.query(queryString, whereParams, function(err, result) {
			doneDB();
			if(err){ console.error('Cant select\n', queryString, '\n' + err); done('DB_ERROR'); return; }

			var essences = [];

			// По всем строком из результата SQL запроса
			for(var i=0; i<result.rows.length; i++){
				var newEssence = new Essence(_this, result.rows[i], params.join);

				// Ищем, может из за джойна этот объект уже создавался
				for(var j=0; j<essences.length; j++){
					if(essences[j].id && newEssence.id && essences[j].id == newEssence.id){ // Такой объект уже есть

						for(var join in joinsCache){
							essences[j][joinsCache[join].essence.name].push( newEssence[joinsCache[join].essence.name][0] );
						}

						newEssence = null; // Чтобы не добавлять в результирующую коллекцию
						break;
					}
				}

				if(newEssence){
					essences.push( newEssence );	
				}
			}

			if(_this.jorm.log) console.info('Getted '+ _this.table, essences.length);	

			done && done(err, essences);
		});
	});
}

Essence.prototype.save = function(done) {
	var _this = this;

	this.jorm.dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		if(_this.id){ // update
			if(_this.jorm.log) console.info('Start update ', _this.table);
		
			var updateFields = '';
			var i = 2;
			var updateParams = [ _this.id ];

			for(var property in _this.fields){
				if(property == 'id' || property == 'created') continue;

				updateFields += (updateFields.length > 0 ? ', ' : '') + property + '=$' + i.toString();
				updateParams.push(_this[property]);
				i++;
			}

			var updateString = 'UPDATE "'+ _this.table +'" SET '+ updateFields +' WHERE id=$1';

			if(_this.jorm.logSQL) console.log(updateString, updateParams);
			
			client.query(updateString, updateParams, function(err, result) {
				doneDB();
				if(err){ console.error('Cant update\n', updateString, '\n' + err); done('DB_ERROR'); return; }

				if(_this.jorm.log) console.info('Updated', _this.table);
				done && done(null, _this);
			});
		}
		else{ // insert
			if(_this.jorm.log) console.info('Start insert ', _this.table);

			var insertFields = '';
			var insertValues = '';
			var i = 1;
			var insertParams = [];

			for(var property in _this.fields){
				if(property == 'id' || property == 'created') continue;

				insertFields += (insertFields.length > 0 ? ', ' : '') + property;
				insertValues += (insertValues.length > 0 ? ', ' : '') + '$' + i.toString();
				insertParams.push(_this[property]);
				i++;
			}

			var insertString = 'INSERT INTO "' + _this.table + '" (' + insertFields + ') VALUES (' + insertValues +') RETURNING id';

			if(_this.jorm.logSQL) console.log(insertString, insertParams);
		
			client.query(insertString, insertParams, function(err, result) {
				doneDB();
				if(err){ console.error('Cant insert\n', insertString, '\n'+err); done('DB_ERROR'); return; }

				_this.id = result.rows[0].id;
				if(_this.jorm.log) console.info('Inserted', _this.table);
				done && done(err, _this);
			});
		}
		
	});
};

Essence.prototype.delete = function(done) {
	var _this = this;

	this.jorm.dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		if(_this.jorm.log) console.info('Start delete ', _this.table);

		client.query('DELETE FROM "' + _this.table + '" WHERE id = $1', [_this.id], function(err, result) {
			doneDB();
			if(err){ console.error('Cant delete ' + _this.table, err); done('DB_ERROR'); return; }

			if(_this.jorm.log) console.info('Deleted', _this.table);
			done && done(err, _this);
		});
		
	});
};

Essence.prototype.getPublicInternal = function() {
	var publicThis = {};
	for(var property in this.fields){
		publicThis[property] = this[property];
	}

	for(var property in this){
		if(
				(this[property] instanceof Array && this[property].length > 0 && this[property][0].getPublic) ||
				(this[property] instanceof Array && this[property].length == 0)
		) {
			var joinedEssences = [];
			for(var j=0; j< this[property].length; j++){
				joinedEssences.push(this[property][j].getPublic());
			}
			publicThis[property] = joinedEssences;
		}
	}

	return publicThis;
};

Essence.prototype.getPublic = function () {
	return this.getPublicInternal();
}

module.exports = Essence;
