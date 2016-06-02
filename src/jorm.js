var pg = require('pg');
var async = require('async');
var _ = require('lodash');

var sql = require('sql');
sql.setDialect('postgres');

var essence = require('./essence');

jorm = null;

Array.prototype.getPublic = function(fields, params) {
	var publicArr = [];
	_.forEach(this, function(item) {
		var publicItem = 
			(typeof(item.getPublic) == "function") ? 
				item.getPublic(fields, params) : 
				item;
		publicArr.push(publicItem);
	});

	return publicArr;
}

module.exports = function(jormParams, config) {
	jorm = this;

	_.assign(this, {logger: console}, jormParams);

	this.dbLabmda = function (beforeTrigger, action, afterTrigger, errorTrigger, callback) {
		var _client;
		var _donePG;

		async.waterfall([

			// Подключаемся
			function(callback){
				pg.connect(jorm.connectionString, callback);
			},
		
			// Триггер before
			function(client, donePG, callback){
				_client = client
				_donePG = donePG;

				beforeTrigger ? beforeTrigger(client, callback) : callback();
			},

			// Выполняем основной функционал запроса
			function(callback) {
				action(_client, callback);
			},

			// Завершаем триггером after
			function(dataFromDB, callback) {
				afterTrigger ? afterTrigger(_client, dataFromDB, callback) : callback(null, dataFromDB);
			}

		], function (err, dataFromDB) {
			function complete () {
				_donePG&&_donePG();

				callback(err, dataFromDB);			
			}

			(err && errorTrigger) ? errorTrigger(err, complete) : complete();
		});
	}

	this.default_before = function (client, callback) {
		callback();
	};

	this.default_after = function (client, dataFromDB, callback) {
		callback(null, dataFromDB);
	}

	this.default_error = function (err, callback) {
		callback();
	}

	_.forEach(config, function(essenceConfig, essenceName) {
		var pk = _.findKey(essenceConfig.fields, {pk: true}) || 'id';
		if(!essenceConfig.fields[pk]) throw new Error('No primary key defined in essence ' + essenceName);

		jorm[essenceName] = _.assign( {}, essence, {
			init: essenceConfig.init,
			create: function (params) {
				return new essence(this, params || {});
			},
			_meta: {
				name: essenceName,
				pk: pk,
				jorm: jorm,
				config: essenceConfig,
				sql: sql.define({
					name: essenceConfig.table,
					columns: _.pickBy(essenceConfig.fields, function(field_value) {
						return _.has(field_value, 'db') || !field_value['db']
					})
				})
			}
		});

		_.forEach(['select', 'insert', 'update', 'delete'], function(command) {
			_.forEach(['after', 'before', 'error'], function(trigger) {
				var signature = command+'_'+trigger;
				jorm[essenceName][signature] = essenceConfig[signature] || jorm['default_'+trigger];
			});
		});
	});
}
