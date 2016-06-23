var pg = require('pg');
var async = require('async');
var _ = require('lodash');
var uuid = require('node-uuid');
var crypto = require('crypto');

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
}

function getSelectFields(essence) {	
	var fields = _.pickBy(essence._meta.config.fields, function(field_value, field_key) {
		return !_.has(field_value, 'db') || 
			field_value['db'] == 'select' || 
			(Array.isArray(field_value['db']) && field_value['db'].indexOf('select') != -1);
	});
	fields = _.keys(fields);
	return fields;
}
function fieldsWithAlias (meta, fields, alias) {
	return _.map(fields, function(field) {
		if(_.has(meta.config.fields[field], 'sql'))
			return meta.config.fields[field].sql.replace('"'+meta.config.table+'"', '"'+alias+'"') + ' as "' + alias + '.' + field + '"';
		else 
			return meta.sql.as(alias)[field].as(alias+'.'+field);
	});
}


Essence.get = function(fields, params, callback) {
	if(typeof params == 'function') {
		callback = params;
		params = {};
	}

	var _this = this;
	var _query;

	jorm.dbLabmda(
		this._meta['select_before'],

		function(client, callback) {

			async.waterfall([

				// Подготавливаем запрашиваемые поля и алиасы для самой таблицы и джойнов
				function(callback){
					params.alias = params.alias || uuid.v4().replace(/-/g, '');
					params.sql_obj = _this._meta.sql.as( params.alias );

					params.fields = params.fields || getSelectFields(_this);
					params.fields = _.compact(_.concat(params.fields, params.demand));
					params.fields = fieldsWithAlias(_this._meta, params.fields, params.alias);

					var fieldsToSelect = params.fields;

					_.forEach(params.join, function(join) {

						join.alias = join.alias || uuid.v4().replace(/-/g, '');
						join.sql_obj = join.join._meta.sql.as(join.alias);

						join.to = join.to || _this;
						join.to_sql_obj = (join.to._meta.name == _this._meta.name) ? _this._meta.sql.as(params.alias) :
							join.to._meta.sql.as( _.find(params.join, function(join){ return join.join._meta.name == join.to._meta.name }).alias );

						join.fields = join.fields || getSelectFields(join.join);
						join.fields = fieldsWithAlias(join.join._meta, join.fields, join.alias);

						fieldsToSelect = _.concat(fieldsToSelect, join.fields);
					});

					_query = params.sql_obj.select( fieldsToSelect );

					callback();
				},

				// Все JOIN'ы
				function(callback) {
					if(!params.join) return callback();

					var joinSubQuery = params.sql_obj;

					_.forEach(params.join, function(join) {
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
						console.log('process', field_value, field_key);
						
						var full_field = {
								alias: params.alias,
								value: field_value, 
								columns: [field_key],
								comparsion: '=',
								sql_obj: params.sql_obj,
								and_or: field_value.and_or || 'and'
						};

						// массив {id: [1,2,3]} => where id in (1,2,3)
						if(Array.isArray(field_value)) full_field.comparsion = 'in';
						// простейшее определение {id: 3} => where id = 3
						else if(typeof field_value == 'number' || typeof field_value == 'string') ;
						// в значении уже полное определение
						else _.assign(full_field, field_value);

						fields_with_full_description.push(full_field)
					});

					// Поля WHERE сджойненных таблиц
					_.forEach(params.join, function(join) {
						_.forEach(join.where, function(field_value, field_key) {
							
							// простейшее определение {id: 3} => where id = 3
							var full_field = {
									alias: join.alias,
									value: field_value, 
									columns: [field_key],
									comparsion: '=',
									sql_obj: join.sql_obj,
									and_or: field_value.and_or || 'and'
							};

							// массив {id: [1,2,3]} => where id in (1,2,3)
							if(Array.isArray(field_value)) full_field.comparsion = 'in';
							// простейшее определение {id: 3} => where id = 3
							else if(typeof field_value == 'number' || typeof field_value == 'string') ;
							// в значении уже полное определение
							else _.assign(full_field, field_value);

							fields_with_full_description.push(full_field)
						});
					});

					// console.log('fields_with_full_description', fields_with_full_description);

					// Определяем все sql колонки
					_.forEach(fields_with_full_description, function(full_field) {
						full_field.sql_columns = [];

						_.forEach(full_field.columns, function(column) {
							full_field.sql_columns.push(full_field.sql_obj[column]);
						});
					});

					callback(null, fields_with_full_description);
				},

				// Подготавливаем WHERE запрос на основании полных определений полей
				function(fields_with_full_description, callback){

					var where_clause = null;

					var sql_comparsion = {
						'in': 'in',
						'like': 'like',
						'=': 'equals',
						'<': 'lt', 
						'>': 'gt',
						'<=': 'lte',
						'=<': 'lte',
						'>=': 'gte',
						'=>': 'gte',
					}

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
						else
							full_field.comparsion = full_field.comparsion.toLowerCase();

						// корректируем оператор сравнения
						if(!_.has(sql_comparsion, full_field.comparsion)) return callback({errCode: 'WRONG_WHERE_FIELD_COMPARSION'});
						else full_field.comparsion = sql_comparsion[full_field.comparsion];

						// console.log('full_field', _.omit(full_field, 'sql_obj'));

						var where_clause_on_this_step = full_field.sql_columns[0][ full_field.comparsion ]( full_field.value );
						if(full_field.sql_columns.length > 1)
							for(var i=1; i<full_field.sql_columns.length; i++){
								var where_column = full_field.sql_columns[i][ full_field.comparsion ]( full_field.value )

								where_clause_on_this_step = (full_field.and_or.toLowerCase() == 'and') ? 
									where_clause_on_this_step.and(where_column):
									where_clause_on_this_step.or(where_column);
							}

						if(where_clause) where_clause = where_clause.and(where_clause_on_this_step);
						else where_clause = where_clause_on_this_step;

						// console.log('where_clause', where_clause.toQuery());
					});
					
					if(where_clause) _query = _query.where(where_clause);
				
					callback();
				},

				// Подготавливаем ORDER, LIMIT и OFFSET
				function(callback) {
					if(params.order){
						var field_order_sql_obj = params.sql_obj[params.order.field];

						if(!field_order_sql_obj) return callback({errCode: 'WRONG_ORDER_DEFINITION'});
						
						var direction = params.order.direction || 'asc';
						_query = _query.order(field_order_sql_obj[direction] );
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
					var result = [];
					var joined_essences = [];

					_.forEach(dataFromDB.rows, function(row) {						

						var essence = new Essence(jorm[_this._meta.name], row, params.alias);
						if(!_.find(result, {id: essence.id})){
							result.push(essence);
						}

						_.forEach(params.join, function(join) {							
							essence = new Essence(jorm[join.join._meta.name], row, join.alias);
							if(!essence[join.join._meta.pk]) return;

							console.log('essence', essence.getPublic());

							if(!_.find(joined_essences, function(existing_essence) {
								return existing_essence.id == essence.id && existing_essence._meta.name == essence._meta.name;
							})){
								joined_essences.push(essence);
							}
						})
					});


					callback(null, result, joined_essences);
				},

				// Собираем коллекцию объектов нужного типа и сджойненные объекты в одну коллекцию
				function(result, joined_essences, callback) {
					var all_essences = _.concat(result, joined_essences);

					_.forEach(params.join, function(join) {

						var child_essences = _.filter(all_essences, function(essence) {
							return essence._meta.name == join.join._meta.name
						});

						_.forEach( child_essences, function(child_essence) {
							var parent_essence = _.find(all_essences, function(parent_essence) {
								return parent_essence._meta.name == join.to._meta.name && parent_essence[join.parent_field] == child_essence[join.field];
							});
							if(!parent_essence) console.log('parent_essences',result.getPublic(), '\n\n', 'child_essence', child_essence.getPublic());
							parent_essence[child_essence._meta.name] = parent_essence[child_essence._meta.name] || [];
							parent_essence[child_essence._meta.name].push(child_essence);

						});

					});

					// console.log(JSON.stringify(result.getPublic(), null, '\t'));

					callback(null, result);
				}

			], function (err, result) {
				if(err) {
					console.error(err);
					return callback(err);
				}

				callback(null, result);
			});
		},

		this._meta['select_after'],
		this._meta['select_error'],

		function(err, dataFromDB) {
			callback(err, dataFromDB, _query);
		}
	);
}

Essence.prototype.save = function(callback) {
	var _this = this;
	var _query;

	var command = this[this._meta.pk] ? 'update' : 'insert';

	jorm.dbLabmda(
		this._meta[command+'_before'],

		function(client, callback) {
			
			var fields = _.pickBy(_this._meta.config.fields, function(field_value, field_key) {
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
			// console.log(_query.text, _query.values);
			client.query(_query.text, _query.values, callback);
		},

		this._meta[command+'_after'],
		this._meta[command+'_error'],

		function(err, dataFromDB) {
			if(!err && command == 'insert')	_this[_this._meta.pk] = dataFromDB.rows[0][_this._meta.pk];
			callback(err, _this, _query);
		}
	);
};

Essence.prototype.delete = function(callback) {
	var _this = this;
	var _query;

	jorm.dbLabmda(
		this._meta['delete_before'],

		function(client, callback) {
			var sql = _this._meta.sql;
			var pk = _this._meta.pk;

			_query = _this._meta.sql.delete().where( _this._meta.sql[_this._meta.pk].equals( _this[_this._meta.pk] ) ).toQuery();
			// console.log(_query.text, _query.values);
			client.query(_query.text, _query.values, callback);
		},

		this._meta['delete_after'],
		this._meta['delete_error'],

		function(err) {
			callback(err, _query);
		}
	);
};

Essence.prototype.getPublic = function(publicSchema) {
	var _this = this;

	var public_copy = _.pick(this, _.keys(this._meta.config.fields));
	_.forEach(jorm, function(essence) {
		if(essence._meta && _this[essence._meta.name]) 
			public_copy[essence._meta.name] = _this[essence._meta.name].getPublic();
	});

	return public_copy;
}

module.exports = Essence;