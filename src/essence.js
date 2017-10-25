// var pg = require('pg');
var async = require('async');
var _ = require('lodash');
var uuid = require('uuid');
// var crypto = require('crypto');

// var jorm = require('./jorm');

var Essence = function(essenseType, params, alias) {	
	// console.log('\n\ninit', essenseType._meta.name, 'by', params, alias);
	var _this = this;

	_.assign(this, essenseType);

	_.forEach(this._meta.config.fields, function(field, field_name) {
		var param_with_alias = alias ? alias+'.'+field_name : field_name;

		if(_.has(params, param_with_alias))
			_this[field_name] = params[param_with_alias];
		else {
			if(typeof field.default == 'function') _this[field_name] = field.default();
			else if(_.has(field, 'default')) _this[field_name] = field.default;
		}		
	});

	if(this.init) this.init();
	// console.log(this);
};

function getSelectFields(essence) {	
	var fields = _.pickBy(essence._meta.config.fields, function(field_value) {
		return !_.has(field_value, 'db') || 
			field_value['db'] == 'select' || 
			(Array.isArray(field_value['db']) && field_value['db'].indexOf('select') != -1);
	});
	fields = _.keys(fields);
	return fields;
}
function fieldsWithAlias (meta, fields, sql_alias) {
	return _.map(fields, function(field) {
		if(_.has(meta.config.fields[field], 'sql'))
			return meta.config.fields[field].sql.replace('"'+meta.config.table+'"', '"'+sql_alias+'"') + ' as "' + sql_alias + '.' + field + '"';
		else 
			return meta.sql.as(sql_alias)[field].as(sql_alias+'.'+field);
	});
}


Essence.get = function(fields, get_params, callback) {
	if(typeof get_params == 'function') {
		callback = get_params;
		get_params = {};
	}

	var params = _.assign({}, get_params);

	var _this = this;
	var _query;

	_this._meta.jorm.dbLabmda(
		_this._meta.jorm[_this._meta.name]['select_before'],

		function(client, callback) {

			async.waterfall([

				// Подготавливаем запрашиваемые поля и алиасы для самой таблицы и джойнов
				function(callback){
					params.and_or = params.and_or || 'and';

					params.sql_alias = params.alias || uuid.v4().replace(/-/g, '');
					params.sql_obj = _this._meta.sql.as( params.sql_alias );

					params.fields = params.fields || getSelectFields(_this);
					params.fields = _.compact(_.concat(params.fields, params.demand));
					params.fields = fieldsWithAlias(_this._meta, params.fields, params.sql_alias);

					var fieldsToSelect = params.fields;

					var join_error;
					_.forEach(params.join, function(join) {
						join.to = join.to || _this;

						join.alias = join.alias || join.join._meta.name;
						join.sql_alias = uuid.v4().replace(/-/g, '');
						join.sql_obj = join.join._meta.sql.as(join.sql_alias);

						if(join.to._meta && join.to._meta.name == _this._meta.name) {
							join.to_sql_obj = _this._meta.sql.as(params.sql_alias);
							join.to_alias = params.alias;
						}
						else if(join.to && typeof join.to == 'string') {
							var parent_join1 = _.find(params.join, function(parent_join){ return parent_join.alias == join.to; });
							if(!parent_join1) {
								join_error = {errCode: 'NO_PARENT_JOIN_ESSENCE_BY_ALIAS'}; 
								return false;
							}
							join.to_sql_obj = parent_join1.join._meta.sql.as( parent_join1.sql_alias );
							join.to_alias = parent_join1.alias;
						}
						else if(join.to._meta){
							var parent_join2 = _.find(params.join, function(parent_join){ return parent_join.join._meta.name == join.to._meta.name; });
							if(!parent_join2) {
								join_error = {errCode: 'NO_PARENT_JOIN_ESSENCE_BY_ENTITY'}; 
								return false;
							}
							join.to_sql_obj = parent_join2.join._meta.sql.as( parent_join2.sql_alias );
							join.to_alias = parent_join2.alias;
						}
						else {
							join_error = {errCode: 'NO_PARENT_JOIN_ESSENCE_BY_TO'}; 
							return false;
						}

						join.fields = join.fields || getSelectFields(join.join);
						join.fields = fieldsWithAlias(join.join._meta, join.fields, join.sql_alias);

						fieldsToSelect = _.concat(fieldsToSelect, join.fields);
					});
					if(join_error) return callback(join_error);

					_query = params.sql_obj.select( fieldsToSelect );

					callback();
				},

				// Все JOIN'ы
				function(callback) {
					if(!params.join) return callback();

					var joinSubQuery = params.sql_obj;

					_.forEach(params.join, function(join) {
						if(!join.to_sql_obj[ join.parent_field ]) throw new Error(`Unknown field ${join.parent_field} in ${join.to_sql_obj.table._name}`);
						joinSubQuery = joinSubQuery.leftJoin(join.sql_obj)
							.on( join.to_sql_obj[ join.parent_field ].equals( join.sql_obj[ join.field ] ) );
					});

					_query = _query.from( joinSubQuery );

					callback();
				},

				// Подготавливаем полные определения полей для WHERE
				function(callback){

					// Полная сигнатура определениий всех колонок WHERE (см. README)
					// { sql_obj: sql, columns: ['a','b'], comparsion: '>=', value: 3 }
					var fields_with_full_description = [];

					// Поля WHERE основной таблицы
					_.forEach(fields, function(field_value, field_key) {
						// console.log('process', field_value, field_key);
						
						var full_field = {
							alias: params.sql_alias,
							value: field_value, 
							columns: [field_key],
							comparsion: '=',
							sql_obj: params.sql_obj,
							and_or: (field_value && field_value.and_or) || 'and'
						};

						// массив {id: [1,2,3]} => where id in (1,2,3)
						if(Array.isArray(field_value) && full_field.comparsion != 'not in') full_field.comparsion = 'in';
						// простейшее определение {id: 3} => where id = 3
						else if(typeof field_value == 'number' || typeof field_value == 'string') ;
						// в значении уже полное определение
						else _.assign(full_field, field_value);

						fields_with_full_description.push(full_field);
					});

					// Поля WHERE сджойненных таблиц
					_.forEach(params.join, function(join) {
						_.forEach(join.where, function(field_value, field_key) {
							
							// простейшее определение {id: 3} => where id = 3
							var full_field = {
								alias: join.sql_alias,
								value: field_value, 
								columns: [field_key],
								comparsion: '=',
								sql_obj: join.sql_obj,
								and_or: field_value.and_or || 'and'
							};

							// массив {id: [1,2,3]} => where id in (1,2,3)
							if(Array.isArray(field_value) && full_field.comparsion != 'not in') full_field.comparsion = 'in';
							// простейшее определение {id: 3} => where id = 3
							else if(typeof field_value == 'number' || typeof field_value == 'string') ;
							// в значении уже полное определение
							else _.assign(full_field, field_value);

							fields_with_full_description.push(full_field);
						});
					});

					// console.log('fields_with_full_description', fields_with_full_description);

					// Определяем все sql колонки
					_.forEach(fields_with_full_description, function(full_field) {
						full_field.sql_columns = [];

						_.forEach(full_field.columns, function(column) {
							if(!full_field.sql_obj[column]) throw new Error('No column [' + column + '] in dto object');
							full_field.sql_columns.push(full_field.sql_obj[column]);
						});
					});

					callback(null, fields_with_full_description);
				},

				// Подготавливаем WHERE запрос на основании полных определений полей
				function(fields_with_full_description, callback){

					var where_clause = null;

					var sql_comparsion = {
						'not in': 'notIn',
						'=': 'equals',
						'<>': 'notEquals',
						'<': 'lt', 
						'>': 'gt',
						'<=': 'lte',
						'=<': 'lte',
						'>=': 'gte',
						'=>': 'gte',
						'is null': 'isNull',
						'is not null': 'isNotNull',
					};

					_.forEach(fields_with_full_description, function(full_field) {

						// ----------- дополняем поля по-умолчанию ----------

						// ошибка - передана херня в качестве описания поля
						if(typeof full_field != 'object')
							return callback({errCode: 'WRONG_WHERE_FIELD_DEFINITION'});

						// ошибка - нет value
						if(!_.has(full_field, 'value'))
							return callback({errCode: 'WRONG_WHERE_FIELD_VALUE'});

						// добиваем оператором сравнения
						if(!_.has(full_field, 'comparsion'))
							full_field.comparsion = '=';

						// корректируем оператор сравнения
						if(sql_comparsion[full_field.comparsion]) full_field.comparsion = sql_comparsion[full_field.comparsion];
						else if(sql_comparsion[full_field.comparsion.toLowerCase()]) full_field.comparsion = sql_comparsion[full_field.comparsion.toLowerCase()];
						else if(full_field.sql_columns[0][ full_field.comparsion.toLowerCase() ]) full_field.comparsion = full_field.comparsion.toLowerCase();

						if(typeof full_field.sql_columns[0][ full_field.comparsion ] != 'function') return callback({errCode: 'WRONG_WHERE_FIELD_COMPARSION', details: full_field.comparsion});
						
						var where_clause_on_this_step = full_field.sql_columns[0][ full_field.comparsion ]( full_field.value );

						if(full_field.sql_columns.length > 1)
							for(var i=1; i<full_field.sql_columns.length; i++){

								if(typeof full_field.sql_columns[i][ full_field.comparsion ] != 'function') return callback({errCode: 'WRONG_WHERE_FIELD_COMPARSION', details: full_field.comparsion});

								var where_column = full_field.sql_columns[i][ full_field.comparsion ]( full_field.value );

								where_clause_on_this_step = (full_field.and_or.toLowerCase() == 'and') ? 
									where_clause_on_this_step.and(where_column):
									where_clause_on_this_step.or(where_column);
							}

						if(where_clause) 
							where_clause = params.and_or.toLowerCase() == 'and'? 
								where_clause.and(where_clause_on_this_step):
								where_clause.or(where_clause_on_this_step);
						else where_clause = where_clause_on_this_step;

						// console.log('where_clause', where_clause.toQuery());
					});

					if(where_clause) _query = _query.where(where_clause);

					callback();
				},

				// Подготавливаем ORDER, LIMIT и OFFSET
				function(callback) {

					if(params.order){

						if(!Array.isArray(params.order)) params.order = [params.order];

						_.forEach(params.order, function(order) {
							order.dto = order.dto || _this;
							order.sql_alias = order.dto._meta.name == _this._meta.name ? 
								params.sql_alias : 
								_.find(params.join, function(join) { return join.join._meta.name == order.dto._meta.name; }).sql_alias;

							// console.log('order.alias', order.alias);

							order.sql_obj = order.dto._meta.sql.as(order.sql_alias);
							var field_order_sql_obj = order.sql_obj[order.field];

							if(!field_order_sql_obj) return callback({errCode: 'WRONG_ORDER_DEFINITION'});
							
							var direction = order.direction || 'asc';
							_query = _query.order(field_order_sql_obj[direction] );
						});							
					}

					if(params.limit) _query = _query.limit(params.limit);
					if(params.offset) _query = _query.offset(params.offset);
					callback();
				},

				// Делаем запрос в базу
				function(callback) {
					_query = _query.toQuery();

					console.log('\n', _query);

					client.query(_query.text, _query.values, callback);
				},

				// Парсим результаты
				function(dataFromDB, callback) {
					var result = {};
					result[params.alias] = [];

					_.forEach(dataFromDB.rows, function(row) {						
						var essence = new Essence(_this._meta.jorm[_this._meta.name], row, params.sql_alias);
						
						var already_added = _.find(result[params.alias], function(existing_essence) { 
							return existing_essence[_this._meta.pk] == essence[_this._meta.pk];
						});

						if(!already_added){
							result[params.alias].push(essence);
						}

						_.forEach(params.join, function(join) {			

							essence = new Essence(_this._meta.jorm[join.join._meta.name], row, join.sql_alias);
							if(!essence[join.join._meta.pk]) return;

							if(!result[join.alias]) result[join.alias] = [];

							var already_added = _.find(result[join.alias], function(existing_essence) { 
								return existing_essence[join.join._meta.pk] == essence[join.join._meta.pk];
							});

							if(!already_added){
								result[join.alias].push(essence);
							}
						});
					});

					callback(null, result);
				},

				// Собираем коллекцию объектов нужного типа и сджойненные объекты в одну коллекцию
				// function(result, joined_essences, callback) {
				function(result, callback) {
					// var all_essences = _.concat(result, joined_essences);

					_.forEach(params.join, function(join) {

						_.forEach( result[join.alias], function(child_essence) {

							var parent_essences = _.filter(result[join.to_alias], function(parent_essence) {
								return parent_essence[join.parent_field] == child_essence[join.field];
							});

							_.forEach(parent_essences, function (parent_essence) {
								var field_name = join.alias;
								// var field_name = (join.to._meta && join.to._meta.config.fields[join.parent_field].alias) || child_essence._meta.name;
	
								if(!parent_essence[field_name]) parent_essence[field_name] = [];
								parent_essence[field_name].push(child_essence);
							});
						});

					});

					// console.log(JSON.stringify(result.getPublic(), null, '\t'));

					callback(null, _.values(result[params.alias]));
				}

			], function (err, result) {
				if(err) {
					console.error(err);
					return callback(err);
				}

				callback(null, result);
			});
		},

		_this._meta.jorm[_this._meta.name]['select_after'],
		_this._meta.jorm[_this._meta.name]['select_error'],

		get_params,

		function(err, dataFromDB) {
			callback && callback(err, dataFromDB, _query);
		}
	);
};

Essence.prototype.save = function(params, callback) {
	var _this = this;
	var _query;

	if(!params) params = {};
	if(!callback && typeof params == 'function') { callback = params; params = {}; }
	if(typeof params == 'function') params = params();

	var command = this[this._meta.pk] ? 'update' : 'insert';

	_this._meta.jorm.dbLabmda(
		_this._meta.jorm[_this._meta.name][command+'_before'],

		function(client, callback) {
			
			var fields = _.pickBy(_this._meta.config.fields, function(field_value) {
				return !_.has(field_value, 'db') || 
					field_value['db'] == command || 
					(Array.isArray(field_value['db']) && field_value['db'].indexOf(command) != -1);
			});
			if(command == 'update') delete fields[_this._meta.pk];
			var object_to_save = _.pick(_this, _.keys(fields));

			_query = _this._meta.sql[command](object_to_save);
			_query = command == 'insert' ? 
				_query.returning().toQuery() : 
				_query.where( _this._meta.sql[_this._meta.pk].equals(_this[_this._meta.pk]) ).toQuery();
			
			console.log('\n', _query);

			client.query(_query.text, _query.values, callback);
		},

		_this._meta.jorm[_this._meta.name][command+'_after'],
		_this._meta.jorm[_this._meta.name][command+'_error'],

		params,

		function(err, dataFromDB) {
			if(err) console.error(err);

			if(!err && command == 'insert')	_this[_this._meta.pk] = dataFromDB.rows[0][_this._meta.pk];
			callback && callback(err, _this, _query);
		}
	);
};

Essence.prototype.delete = function(params, callback) {
	var _this = this;
	var _query;

	if(!callback && typeof params == 'function') { callback = params; params = {}; }
	if(typeof params == 'function') params = params();

	_this._meta.jorm.dbLabmda(
		_this._meta.jorm[_this._meta.name]['delete_before'],

		function(client, callback) {
			_query = _this._meta.sql.delete().where( _this._meta.sql[_this._meta.pk].equals( _this[_this._meta.pk] ) ).toQuery();
			
			console.log('\n', _query);
			
			client.query(_query.text, _query.values, callback);
		},

		_this._meta.jorm[_this._meta.name]['delete_after'],
		_this._meta.jorm[_this._meta.name]['delete_error'],

		params,

		function(err) {
			if(err) console.error(err);

			callback && callback(err, _query);
		}
	);
};

Essence.prototype.getPublic = function(publicSchema) {
	var _this = this;

	function check_config_publicy(key) {
		var config_value = _this._meta.config.fields[key] || _.find(_this._meta.config.fields, {alias: key});
		return config_value && (
			(!publicSchema && config_value.public) ||
			(publicSchema && config_value.public == publicSchema) ||
			(publicSchema && Array.isArray(config_value.public) && _.indexOf(config_value.public, publicSchema) >= 0) ||
			(publicSchema && Array.isArray(publicSchema) && _.indexOf(publicSchema, config_value.public) >= 0) ||
			(publicSchema && Array.isArray(config_value.public) && Array.isArray(publicSchema) && _.intersection(publicSchema, config_value.public).length > 0)
			);
	}

	var field_keys = [];

	// Проходим по полям из конфига
	_.forEach(this._meta.config.fields, function(field_value, field_key) {
		if(check_config_publicy(field_key) && field_keys.indexOf(field_key) == -1)
			field_keys.push(field_key);
	});
	// Проходим по полям, которые есть в созданном объекте
	_.forOwn(_this, function(value, key) {
		if(check_config_publicy(key) && field_keys.indexOf(key) == -1)
			field_keys.push(key);
		else if(Array.isArray(value))
			field_keys.push(key);
	});
	var public_copy = {};

	_.forEach(field_keys, function(key) {
		var config_value = _this._meta.config.fields[key] || _.find(_this._meta.config.fields, {alias: key});

		if(Array.isArray(_this[key])) public_copy[key] = _this[key].getPublic(publicSchema);
		else if(_this[key] && typeof _this[key].getPublic == 'function') public_copy[key] = _this[key].getPublic(publicSchema);
		else if(config_value && typeof config_value.getPublic == 'function') public_copy[key] = config_value.getPublic(_this, publicSchema);
		else public_copy[key] = _this[key];
	});

	return public_copy;
};

module.exports = Essence;