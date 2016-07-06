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

	this.dbLabmda = function (beforeTrigger, action, afterTrigger, errorTrigger, trigger_params, callback) {
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

				trigger_params.transaction ? jorm.begin_transaction(trigger_params, _client, beforeTrigger, callback) : beforeTrigger(trigger_params, _client, callback);
			},

			// Выполняем основной функционал запроса
			function(callback) {
				action(_client, callback);
			},

			// Завершаем триггером after
			function(dataFromDB, callback) {
				trigger_params.transaction ? jorm.commit_transaction(trigger_params, _client, dataFromDB, afterTrigger, callback) : afterTrigger(trigger_params, _client, dataFromDB, callback);
			}

		], function (err, dataFromDB) {
			function complete () {
				_donePG&&_donePG();

				callback(err, dataFromDB);			
			}

			if(err)
				trigger_params.transaction ? jorm.rollback_transaction(err, trigger_params, _client, errorTrigger, complete) : errorTrigger(err, trigger_params, _client, complete);
			else complete();
		});
	}

	this.default_before = function (params, client, callback) {
		callback();
	};

	this.default_after = function (params, client, dataFromDB, callback) {
		callback(null, dataFromDB);
	}

	this.default_error = function (err, params, client, callback) {
		callback();
	},

	this.begin_transaction = function (params, client, before_handler, callback) {
		client.query('BEGIN', function(err){
			before_handler(params, client, callback);
		});
	};

	this.commit_transaction = function (params, client, dataFromDB, after_handler, callback) {
		client.query('COMMIT', function(err){
			after_handler(params, client, dataFromDB, callback);
		});
	}

	this.rollback_transaction = function (err, params, client, error_handler, callback) {
		client.query('ROLLBACK', function(err){
			error_handler(err, params, client, callback);
		});
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
