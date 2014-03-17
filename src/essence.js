var pg = require('pg');
var extend = require('extend');

var dbLabmda;

var Essence = function(meta, params) {
	this.meta = meta;

	extend(this, meta);
	
	for(var property in meta.fields){
		this[property] = params[property];
	}

	if(this.init) this.init(params);
}

Essence.init = function(dbLabmdaFunc) {
	dbLabmda = dbLabmdaFunc;
}


Essence.internalWhereProcess = function(param, value, index) {
	var whereClause = '';
	var whereParams = [];

	if( value == undefined ) return;
	if( param.indexOf('order by') != -1 ) return;

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
		whereClause += param + ' ' + value.comparsion + ' $' + index.toString();
		whereParams.push(value.value);
		index++;
	}
	else{
		whereClause += param + ' = $' + index.toString();
		whereParams.push(value);
		index++;
	}
	return {whereClause: whereClause, whereParams: whereParams, index: index};
}

Essence.get = function(meta, params, done) {
	console.log('Start get ' + meta.table, params);

	var whereClause;
	var whereParams;
	var orderClause;

	if(meta.where){
		var where = meta.where(params);
		whereClause = where.whereClause;
		whereParams = where.whereParams;
	}
	
	if(!whereClause && !whereParams){
		var index = 1;
		whereClause = '';
		whereParams = [];

		for(var whereParam in params){
			console.log('\n\n' + 'Process', whereParam, params[whereParam]);
			var where = null;
			if(meta.whereParam){
				where = meta.whereParam(params);
			}

			if(!where){
				where = Essence.internalWhereProcess(whereParam, params[whereParam], index);
			}

			console.log('where', where);
			if(where){
				whereClause += ((whereClause && whereClause.length > 0) ? ' AND ' : ' WHERE ') + where.whereClause;
				whereParams = whereParams.concat(where.whereParams);
				index = where.index || (index + 1);
			}
		}	
	}

	if(meta.order){
		orderClause = meta.order(params);
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

	var selectFields = '';
	for(var property in meta.fields){
		selectFields += (selectFields.length > 0 ? ', ' : '') + property;
	}

	dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		var queryString = 'SELECT '+ selectFields +' FROM "' + meta.table + '"' + (whereClause || '') + orderClause;

		console.log(queryString, whereParams);
		client.query(queryString, whereParams, function(err, result) {
			doneDB();
			if(err){ console.error('Cant select ' + meta.table, err); done('DB_ERROR'); return; }

			var essences = [];

			for(var i=0; i<result.rows.length; i++){
				essences.push( new Essence(meta, result.rows[i]) );
			}

			console.info('Getted '+ meta.table, essences.length);
			done && done(err, essences);
		});
	});
}

Essence.prototype.save = function(done) {
	var _this = this;

	dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		if(_this.id){ // update
			console.info('Start update ', _this.meta.table);
		
			var updateFields = '';
			var i = 2;
			var updateParams = [ _this.id ];

			for(var property in _this.meta.fields){
				if(property == 'id' || property == 'created') continue;

				updateFields += (updateFields.length > 0 ? ', ' : '') + property + '=$' + i.toString();
				updateParams.push(_this[property]);
				i++;
			}

			var updateString = 'UPDATE "'+ _this.meta.table +'" SET '+ updateFields +' WHERE id=$1';

			console.log(updateString, updateParams);
			client.query(updateString, updateParams, function(err, result) {
				doneDB();
				if(err){ console.error('Cant update '+_this.meta.table, err); done('DB_ERROR'); return; }

				console.info('Updated', _this.meta.table);
				done && done(null, _this);
			});
		}
		else{ // insert
			console.info('Start insert ', _this.meta.table);

			var insertFields = '';
			var insertValues = '';
			var i = 1;
			var insertParams = [];

			for(var property in _this.meta.fields){
				if(property == 'id' || property == 'created') continue;

				insertFields += (insertFields.length > 0 ? ', ' : '') + property;
				insertValues += (insertValues.length > 0 ? ', ' : '') + '$' + i.toString();
				insertParams.push(_this[property]);
				i++;
			}

			var insertString = 'INSERT INTO "' + _this.meta.table + '" (' + insertFields + ') VALUES (' + insertValues +') RETURNING id';

			console.log(insertString, insertParams);
			client.query(insertString, insertParams, function(err, result) {
				doneDB();
				if(err){ console.error('Cant insert ' + _this.meta.table, err); done('DB_ERROR'); return; }

				_this.id = result.rows[0].id;
				console.info('Inserted', _this.meta.table);
				done && done(err, _this);
			});
		}
		
	});
};

Essence.prototype.delete = function(done) {
	var _this = this;

	dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		console.info('Start delete ', _this.meta.table);

		client.query('DELETE FROM "' + _this.meta.table + '" WHERE id = $1', [_this.id], function(err, result) {
			doneDB();
			if(err){ console.error('Cant delete ' + _this.meta.table, err); done('DB_ERROR'); return; }

			console.info('Deleted', _this.meta.table);
			done && done(err, _this);
		});
		
	});
};

module.exports = Essence;
