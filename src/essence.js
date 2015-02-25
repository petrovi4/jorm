var pg = require('pg');
var extend = require('extend');
var uuid = require('node-uuid');
var crypto = require('crypto');

var Essence = function(meta, params, joinParams, prefix) {	
	//console.log('Create new', meta, '\n with params', params, '\nwith join params', joinParams, '\n and prefix', prefix);
	extend(this, meta);
	
	var inited = false;
	var props = [];
		for (var property in meta.fields)
			props.push(property);
	
		if (meta.extraFields != undefined)
			for (var extraProperty in meta.extraFields)
				props.push(extraProperty);
		
	for(var i = 0; i < props.length; i++){
		var property = props[i];
		if(params[property] != null && params[property] != undefined){
			this[property] = params[property];	
		}
		else if(params[prefix + '.' + property] != null && params[prefix + '.' + property] != undefined){
			this[property] = params[prefix + '.' + property];
		}
		else if(!prefix){ // если есть prefix - значит инициализируем сджойненую таблицу, а значит оригинальную таблицу не просматриваем
			this[property] = params[meta.table + '.' + property];
		}
		inited |= !!this[property];
	}
	if(!inited){
		throw new Error('NOT_INITIALIZED');
	}

	for(var joinIndex=0; joinIndex < (joinParams||[]).length; joinIndex++){
		var join = this.getJoinParams( joinParams[joinIndex] );
		try{
			var joineEssence = new Essence(join.essence, params, null, join.prefix);
			var fieldName =
					join.fieldName
							? join.fieldName
							: join.essence.name;

			this[fieldName] = [joineEssence];
		}
		catch(err){ if(this.jorm.log){ console.error(err); } }
	}
				
	if(this.init) this.init(params);
}


Essence.whereParamInternal = function(prefix, param, value, index) {
	var whereClause = '';
	var whereParams = [];

	if(this.jorm.log) console.log('Process param', prefix, param, value, index);

	if( value == undefined && value != null ) return;
	if( param.toString().indexOf('order by') != -1 ) return;
	if( param == 'join' ) return;
	if( param =='limit' ) return;
	if( param =='offset' ) return;

	if(value == null){
		whereClause += '"' + prefix + '"."' + param + '" is null';
	}
	else if(value instanceof Array){
		whereClause += '"' + prefix + '"."' + param + '" in (';
		for(var arrayIndex = 0; arrayIndex < value.length; arrayIndex++){
			whereClause += (arrayIndex == 0 ? '' : ', ') + '$' + index.toString();
			whereParams.push( value[arrayIndex].id ? value[arrayIndex].id : value[arrayIndex]);
			index++;
		}
		whereClause += ')';
	}
	else if(value.comparsion){
		whereClause += '"' + prefix + '"."' + (value.field || param) + '" ' + value.comparsion + ' $' + index.toString();
		whereParams.push(value.value);
		index++;
	}
	else if(value.between){
		whereClause += '"' + prefix + '"."' + (value.field || param) + '" between $' + (index++).toString() + ' and $' + (index++).toString();
		whereParams.push(value.between);
		whereParams.push(value.and);
	}
	else if(param == 'search' && value.columns && value.value){
		for(var i=0; i < value.columns.length; i++){
			whereClause += (whereClause.length == 0 ? '(' : ' OR ') + 'LOWER("' + prefix + '"."' + value.columns[i] + '") LIKE $' + index.toString();
		}
		whereClause += ')';
		whereParams.push(value.value);
		index++;
	}
	else if(param.toString().indexOf('.') != -1){
		whereClause += '"' + param + '" = $' + index.toString();
		whereParams.push(value);
		index++;
	}
	else{
		whereClause += '"' + prefix + '"."' + param + '" = $' + index.toString();
		whereParams.push(value);
		index++;
	}
	return {whereClause: whereClause, whereParams: whereParams, index: index};
}
Essence.whereParam = function(prefix, param, value, index) {
	return this.whereParamInternal(prefix, param, value, index);
}


Essence.whereInternal = function(prevWhere, prefix, params) {
	// console.log('Where internal', prevWhere, this.table, prefix, params);

	for(var whereParam in params){
		var where = null;
		if(this.whereParam){
			where = this.whereParam(prefix, whereParam, params[whereParam], prevWhere.index);
		}

		if(!where){
			where = this.whereParam( prefix, whereParam, params[whereParam], prevWhere.index);
		}

		if(where){
			prevWhere.whereClause += (prevWhere.whereClause.length > 0 ? ' AND' : '') + ' (' + where.whereClause + ')';
			prevWhere.whereParams = prevWhere.whereParams.concat(where.whereParams);
			prevWhere.index = where.index || (prevWhere.index + 1);
		}
	}

	return prevWhere;
}
Essence.where = function(prevWhere, prefix, params) {
	return this.whereInternal(prevWhere, prefix, params);
}


Essence.selectFieldsInternal = function(params, prefix) {
	// console.log('params, prefix', params, prefix);

	prefix = prefix || this.table;
	var selectFields = '';
	for(var property in this.fields){
		selectFields += (selectFields.length > 0 ? ', ' : '') + '"' + prefix + '"."' + property + '" as "' + prefix + '.' + property + '"';
	}
	return selectFields;
}
Essence.selectFields = function(params, prefix) {
	return this.selectFieldsInternal(params, prefix);
}

Essence.getJoinParams = function(join) {
	var joinObj = (typeof join == 'string') ? {
		essence: this.jorm[join],
		// field: this.jorm[join].table + '_id',
		// joinField: 'id'
	} : join;

	if(typeof joinObj.essence == 'string') joinObj.essence = this.jorm[joinObj.essence];

	if(!joinObj.field) joinObj.field = joinObj.essence.table + '_id';
	if(typeof joinObj.field == 'string') joinObj.field = [joinObj.field];

	if(!joinObj.joinField) joinObj.joinField = 'id';
	if(typeof joinObj.joinField == 'string') joinObj.joinField = [joinObj.joinField];

	if(!joinObj.joinClause) joinObj.joinClause = 'LEFT OUTER JOIN';
	if(!joinObj.prefix) joinObj.prefix = 'j' + uuid.v4().split('-')[0];

	return joinObj;
}


Essence.get = function(params, done) {
	if(this.jorm.log) console.log('Start get', params);	
	var _this = this;
	
	if (params.query == undefined) {
		var selectFields = this.selectFields(params);
		var tablesJoin = '';

		var where = {whereClause: '', whereParams: [], index: 1};

		var orderClause = '';
		var limitClause = '';
		var offsetClause = '';

		var joinsCache = {};

		for(var joinIndex=0; joinIndex < (params.join || []).length; joinIndex++){
			if(this.jorm.log) console.log('joinIndex', joinIndex);
			var join = params.join[joinIndex] = this.getJoinParams(params.join[joinIndex]);

			tablesJoin += ' ' + join.joinClause + ' "' + join.essence.table + '" as "' + join.prefix + '"';
			tablesJoin += ' ON (';
			for(var i=0; i<join.field.length; i++){
				tablesJoin += (i==0?'':' AND ') + '"' + this.table + '"."' + join.field[i] + '" = "' + join.prefix + '"."' + join.joinField[i] + '"';
			}
			tablesJoin += ')';

			selectFields += ', ' + join.essence.selectFields(params, join.prefix);

			where = join.essence.where(where, join.prefix, join.where);

			joinsCache[join.essence.name] = join;
		}

		where = this.where(where, this.table, params);

		if(this.order){
			orderClause = this.order(params);
		}
		if(!orderClause){
			for(var orderParam in params){
				if( params[orderParam] == undefined ) continue;

				if(orderParam == 'order by asc'){
					orderClause = ' order by "' + (params[orderParam].indexOf('.') == -1 ? (this.table + '"."') : '') + params[orderParam] + '" asc';
				}
				else if(orderParam == 'order by desc'){
					orderClause = ' order by "' +  (params[orderParam].indexOf('.') == -1 ? (this.table + '"."') : '') + params[orderParam] + '" desc';
				}
				else if(orderParam == 'order by random'){
					orderClause = ' order by random()';
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

		if(this.offset){
			offsetClause = this.offset(params);
		}
		else{
			for(var offsetParam in params){
				if( params[offsetParam] == undefined ) continue;

				if(offsetParam == 'offset'){
					offsetClause = ' offset ' + parseInt(params[offsetParam]);
				}
			}
		}

		
		var whereClauseConcat = (where.whereClause.length > 0 ? ' WHERE ' : '') + where.whereClause;
		var queryString = 'SELECT '+ selectFields +' FROM "' + _this.table + '"' + tablesJoin + whereClauseConcat + orderClause + limitClause + offsetClause;
		
	} else {
		queryString = params.query;
		where = {whereParams: params.where};
	}
	
	this.jorm.dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done(err); return; }

		if(_this.jorm.logSQL) console.log(queryString, where.whereParams);

		// <<< helpers stuff
		function buildEssences(list) {
			var essences = [];
			
			for(var i=0; i<list.length; i++){
				
				var newEssence = new Essence(_this, list[i], params.join);

				// Ищем, может из-за джойна этот объект уже создавался
				for(var j=0; j<essences.length; j++){
					if(essences[j].id && newEssence.id && essences[j].id == newEssence.id){ // Такой объект уже есть

						for(var joinIndex = 0; joinIndex < (params.join || []).length; joinIndex++){ // Все сджойненые объекты newEssence добавляем в найденный essences[j]
							var joinedName =
									params.join[joinIndex].fieldName
										? params.join[joinIndex].fieldName
										: params.join[joinIndex].essence.name;

							for(var joinedObjectIndex = 0; joinedObjectIndex < (newEssence[ joinedName ] || []).length; joinedObjectIndex++){ // Все сджойненные объекты из newEssence одного типа
								essences[j][joinedName].push( newEssence[ joinedName ][joinedObjectIndex] );
							}
						}

						newEssence = null; // Чтобы не добавлять в результирующую коллекцию
						break;
					}
				}

				if(newEssence){
					essences.push( newEssence );	
				}
			}
			
			return essences;
		}
		
		function fetchFromDb(queryString, params, returning) {
			client.query(queryString, params, function(err, result) {
				doneDB();
				if(err){ console.error('Cant select\n', queryString, '\n' + err); done(err); return; }
				
				returning(result.rows);
			});
		}
		// >>> helpers stuff
		
		if (!_this.jorm.useCache) {
			//Usual and simple way
			fetchFromDb(queryString, where.whereParams, function (rows) {
				var essences = buildEssences(rows);
				if(_this.jorm.log) console.info('Getted '+ _this.table, essences.length);	

				done && done(err, essences);
			});
		} else {
			_this.getCacheKey(queryString, where.whereParams, function (index) {
				_this.jorm.memcache.get(index, function (err, data) {
                    if (!err && data != false) {
						doneDB();
						if (_this.jorm.log) {console.info('Getted from cache ' + data)}
						done(err, buildEssences(data));
					} else {
                        if (err && _this.jorm.log) {
                            console.log('Cache error - ' + err);
                        }

						if (_this.jorm.log) {console.info('Cache is empty, fetching from db')}
						
						fetchFromDb(queryString, where.whereParams, function (rows) {
							_this.jorm.memcache.set(index, rows, 60*60*24, function (err) {
								if (err) {/*can't set value to memcache because of its size. So what?!*/ console.info(err); err = null;}
								
								var essences = buildEssences(rows);
								if(_this.jorm.log) console.info('Getted '+ _this.table, essences.length);	

								done && done(err, essences);
							});
						});
					}
				});
			});
		}
	});
}

Essence.getCacheKey = function (query, params, callback) {
	function attachTagsMark(tagsArr, result, callback) {
		
		if (tagsArr == undefined || tagsArr.length == 0) {
			callback(result); return;
		}
		
		last = tagsArr.pop(); 
		
		this.jorm.memcache.get(last, function(err, getResult) {
			if (err) {console.log(err);}
			
			if (!getResult) {
				createNew(last, result, tagsArr, callback);
				return;
			} else {
				result += '_' + getResult ;
				attachTagsMark(tagsArr, result, callback);
			}
		});
	}
	
	function createNew(index, result, tagsArr, callback) {
		var value = Math.floor((Math.random()*10000)); 
		this.jorm.memcache.set(index, value, 60*60*24, function (err) {
			if (err) {
				console.log(err);
			}
			result += '_' + value;
			attachTagsMark(tagsArr, result, callback);
		});
	}
	
	var shasum = crypto.createHash('sha1');
	
	attachTagsMark(
		this.tags.slice(),
		this.name + '_' + shasum.update(query.toString() + params.toString()).digest('hex'), 
		callback
	);

}

Essence.prototype.cacheDevalidate = function(tagArr, callback, callbackOfCallback, context) {
	function devalidate(tagArr) {
		if (tagArr == undefined || tagArr.length == 0) {
			callback(callbackOfCallback, true, context);
			return;
		}

		this.jorm.memcache.incr(tagArr.pop(), 1, function(err) {
			if (err) { console.log(err); }
			devalidate(tagArr);
		});
	}
			
	devalidate(tagArr);
}

Essence.prototype.save = function(done, cacheWasChecked, initialContext) {
	var _this = (initialContext == undefined) ? this : initialContext;
	
	if (cacheWasChecked == undefined) {
		if (!this.jorm.useCache) {
			this.save(done, true);
		} else {
			this.cacheDevalidate(this.tags.slice(), this.save, done, _this);
		}
		return;
	}
	
	var dbFunctionName = 
		_this.id 
			? _this.jorm.dbLambdaForSave 
			: _this.jorm.dbLambdaForAdd;
		
	dbFunctionName(_this, function(err, client, aftersave, doneDB) {
		if(err){ console.error(err); doneDB(); done(err); return; }

		if(_this.id){ // update
			if(_this.jorm.log) console.info('Start update ', _this.table);
		
			var updateFields = '';
			var i = 2;
			var updateParams = [ _this.id ];

			for(var property in _this.fields){
				if(property == 'id' || property == 'created') continue;

				updateFields += (updateFields.length > 0 ? ', ' : '') + property + '=$' + i.toString();

				var paramFromField = (typeof(_this[property]) == 'object' && _this[property] != null) ? JSON.stringify( _this[property]) : _this[property];
				updateParams.push( paramFromField );

				i++;
			}

			var updateString = 'UPDATE "'+ _this.table +'" SET '+ updateFields +' WHERE id=$1';

			if(_this.jorm.logSQL) console.log(updateString, updateParams);
			
			client.query(updateString, updateParams, function(err, result) {
				if(err){
					console.error('Cant update\n', updateString, '\n' + err); 
					aftersave(err, client, done, err, result, doneDB);
					return; 
				}

				if(_this.jorm.log) console.info('Updated', _this.table);
				//err, client, callback, callbackErr, callbackData, doneDB
				aftersave(null, client, done, null, _this, doneDB);		
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

				var paramFromField = (typeof(_this[property]) == 'object' && _this[property] != null) ? JSON.stringify( _this[property]) : _this[property];
				insertParams.push( paramFromField );

				i++;
			}

			var insertString = 'INSERT INTO "' + _this.table + '" (' + insertFields + ') VALUES (' + insertValues +') RETURNING *';

			if(_this.jorm.logSQL) console.log(insertString, insertParams);
						
			client.query(insertString, insertParams, function(err, result) {
				
				if(err){
					console.error('Cant insert\n', insertString, '\n'+err); 
					aftersave(err, client, done, err, result, doneDB);
					return;
				}

				for (var key in result.rows[0]) {
					_this[key] = result.rows[0][key];
				}
				
				if(_this.jorm.log) console.info('Inserted', _this.table);
				aftersave(null, client, done, null, _this, doneDB);
			});
		}
		
	});
};

Essence.prototype.delete = function(done, cacheWasChecked, initialContext) {
	var _this = (initialContext == undefined) ? this : initialContext;
	
	if (cacheWasChecked == undefined) {
		if (!this.jorm.useCache) {
			this.delete(done, true);
		} else {
			this.cacheDevalidate(this.tags.slice(), this.delete, done, _this);
		}
		return;
	}

	_this.jorm.dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done(err); return; }

		if(_this.jorm.log) console.info('Start delete ', _this.table);
				
		client.query('DELETE FROM "' + _this.table + '" WHERE id = $1', [_this.id], function(err, result) {
			doneDB();
			if(err){ console.error('Cant delete ' + _this.table, err); done(err); return; }

			if(_this.jorm.log) console.info('Deleted', _this.table);
			done && done(err, _this);
		});
		
	});
};


Essence.prototype.getPublicInternal = function(fields, params) {
	var publicThis = {};
	for(var property in this.fields){
		if(this.fields[property].public) publicThis[property] = this[property];
	}

	console.log('publicThis', publicThis);

	for(var property in this){
		if( (this[property] instanceof Array && this[property].length > 0 && typeof(this[property][0].getPublic) == "function") ||
				(this[property] instanceof Array && this[property].length == 0) ) {

			var joinedEssences = [];
			for(var j=0; j< this[property].length; j++){
				
				var publicProperty = 
					(typeof(this[property][j].getPublic) == "function") ? 
						this[property][j].getPublic() : 
						this[property][j]

				joinedEssences.push(publicProperty);
			}

			if (joinedEssences.length > 1)
				publicThis[property] = joinedEssences;
			else if (joinedEssences.length == 1 && joinedEssences[0] instanceof Array)
				publicThis[property] = joinedEssences;
			else if (joinedEssences.length == 1)
				publicThis[property] = joinedEssences[0];
			else
				publicThis[property] = [];
		}
	}

	fields = fields || [];
	if(typeof fields == 'string') fields = [fields];
	for(var i=0; i<fields.length; i++){
		publicThis[fields[i]] = this[fields[i]];
	}

	return publicThis;
};
Essence.prototype.getPublic = function (fields, params) {
	return this.getPublicInternal(fields, params);
}

module.exports = Essence;
