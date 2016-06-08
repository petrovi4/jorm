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
function fieldsWithAlias (sql_obj, fields, alias) {
	return _.map(fields, function(field) {
		return sql_obj[field].as(alias+'.'+field);
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
					// params.sql_obj = _this._meta.sql.as(params.alias);

					params.fields = params.fields || getSelectFields(_this);
					params.fields = fieldsWithAlias(_this._meta.sql, params.fields, params.alias);

					var fieldsToSelect = params.fields;

					_.forEach(params.join, function(join) {

						join.alias = join.alias || uuid.v4().replace(/-/g, '');
						join.join = join.join._meta.sql.as(join.alias);

						join.fields = join.fields || getSelectFields(join.join);
						join.fields = fieldsWithAlias(join.join, join.fields, join.alias);

						fieldsToSelect = _.concat(fieldsToSelect, join.fields);
					});

					_query = _this._meta.sql.select(fieldsToSelect);

					callback();
				},
			
				// Подготавливаем поля WHERE из запроса
				function(callback){

					// Полная сигнатура определениий всех колонок WHERE (см. README)
					// { sql_obj: sql, columns: ['a','b'], comparsion: '>=', value: 3 }
					var fields_with_full_description = [];

					var where_clause = null;

					_.forEach(fields, function(field_value, field_key) {
						console.log('\n\nProcess', field_value, field_key);
						
						var full_field = {};

						// -------- базовые сценарии определения поля --------

						// простейшее определение {id: 3} => where id = 3
						if(typeof field_value == 'number' || typeof field_value == 'string') 
							full_field = { 
								alias: params.alias,
								value: field_value, 
								columns: [field_key],
								comparsion: '='
							}
						// массив {id: [1,2,3]} => where id in (1,2,3)
						else if(Array.isArray(field_value)) 
							full_field = { 
								alias: params.alias,
								value: field_value, 
								columns: [field_key],
								comparsion: 'in'
							}
						else _.assign(full_field, field_value);

						// ----------- дополняем поля по-умолчанию ----------

						// ошибка - передана херня в качестве описания поля
						if(typeof full_field != 'object')
							return callback('WRONG_WHERE_FIELD_DEFINITION');

						// ошибка - нет value
						if(!_.has(full_field, 'value'))
							return callback('WRONG_WHERE_FIELD_VALUE');

						// добиваем алиасом
						if(!_.has(full_field, 'alias'))
							full_field.alias = params.alias;

						// добиваем оператором сравнения
						if(!_.has(full_field, 'comparsion'))
							full_field.comparsion = '=';
						else
							full_field.comparsion = full_field.comparsion.toLowerCase();

						// добиваем колонками, по которым будем сравнивать
						if(!_.has(full_field, 'columns'))
							full_field.columns = [field_key];
						else if(typeof full_field.columns == 'string')
							full_field.columns = [full_field.columns];


						// корректируем оператор сравнения
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
						if(!_.has(sql_comparsion, full_field.comparsion)) return callback('WRONG_WHERE_FIELD_COMPARSION');
						else full_field.comparsion = sql_comparsion[full_field.comparsion];


						// ------- записываем типизированные объекты по алиасам таблиц и полей ---------

						// sql объект, по которому делается where
						if(full_field.alias == params.alias) full_field.sql_obj = _this._meta.sql;
						else {
							var join = _.find(params.join, {alias: full_field.alias});
							if(!join) return callback('BAD_ALIAS_IN_WHERE_FIELD_DEFINITION');
							full_field.sql_obj = join.join;
						}

						console.log('full_field', _.omit(full_field, 'sql_obj'));

						// columns
						var typed_columns = []
						_.forEach(full_field.columns, function(column) {
							typed_columns.push( full_field.sql_obj[column] );
						});
						full_field.columns = typed_columns;

						if(full_field.columns.length > 1) new Error('NOT_IMPLEMENTED');

						var where_clause_on_this_step = full_field.columns[0][ full_field.comparsion ]( full_field.value );
						if(full_field.columns.length > 1)
							for(var i=1; i<full_field.columns.length; i++)
								where_clause_on_this_step = where_clause_on_this_step.or(full_field.columns[i][ full_field.comparsion ]( full_field.value ));
						
						if(where_clause) where_clause = where_clause.and(where_clause_on_this_step);
						else where_clause = where_clause_on_this_step;

						console.log('where_clause', where_clause.toQuery());
					});
					
					_query = _query.where(where_clause);
				
					callback(null);
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
					var joined_essences = {}

					_.forEach(dataFromDB.rows, function(row) {
						var essence = new Essence(jorm[_this._meta.name], row, params.alias);
						if(!_.find(result, {id: essence.id})) 
							result.push(essence);

						_.forEach(params.join, function(join) {
							essence = new Essence(jorm[join.join._meta.name], row, join.alias);
							if(!_.find(joined_essences[join.join._meta.name], {id: essence.id})) 
								joined_essences[join.join._meta.name].push(essence);
						})
					});

					callback(null, result, joined_essences);
				},

				// Собираем коллекцию объектов нужного типа и сджойненные объекты в одну коллекцию
				function(result, joined_essences, callback) {
					// тут код для сборки
	
					console.log(result.getPublic());
					_.forEach(joined_essences, function(value, key) {
						console.log(key, value.getPublic());
					});

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
	return _.pick(this, _.keys(this._meta.config.fields));
}

module.exports = Essence;