var pg = require('pg');
var extend = require('extend');
var async = require('async');
var redis = require('redis');
var _ = require('lodash');

var logger = require('./logger');
var essence = require('./essence');

Array.prototype.getPublic = function(fields, params) {
	var publicArr = [];
	for(var i=0; i<this.length; i++){
		var publicItem = 
			(typeof(this[i].getPublic) == "function") ? 
				this[i].getPublic(fields, params) : 
				this[i]

		publicArr.push(publicItem);
	}
	return publicArr;
}

module.exports = function(jormParams, config) {
	var _this = this;

	this.connectionString = (typeof jormParams == 'string' ? jormParams : jormParams.connectionString);
	this.logger = jormParams.logger ? jormParams.logger : logger;

	this.dbLabmda = function (beforeTrigger, action, afterTrigger, callback) {
		logger.trace('dbLabmda');

		var _client;
		var _donePG;

		async.waterfall([
		
			// Подключаемся
			function(callback){
				pg.connect(_this.connectionString, callback);
			},
		
			// Триггер before
			function(client, donePG, callback){
				_client = client
				_donePG = donePG;

				beforeTrigger(client, callback);
			},

			// Выполняем основной функционал запроса
			function(callback) {
				action(_client, callback);
			},

			// Завершаем триггером after
			function(dataFromDB, callback) {
				afterTrigger(_client, dataFromDB, callback)
			}

		], function (err, dataFromDB) {
			logger.trace('dbLabmda done', err, dataFromDB);

			_donePG&&_donePG();

			if(err) logger.error(err); 

			callback(err, dataFromDB);			
		});
	}

	this.defaultBeforeTrigger = function (client, callback) {

		callback();
	};
	
	this.defaultAfterTrigger = function (client, dataFromDB, callback) {

		callback();
	}

	_.forEach(config, function(essenceName, essenceConfig) {
		_this[essenceName, essenceConfig] = {
			create: function (params) {
				return new essence(this, params || {});
			},
			_meta: {
				jorm: this,
				config: essenceConfig,
				
			}
		}
	});

	for(var essenceMeta in config){

		_this[ essenceMeta ] = extend( {}, essence, config[ essenceMeta ] );

		_this[ essenceMeta ].name = essenceMeta;
		_this[ essenceMeta ].jorm = _this;

		_this[ essenceMeta ].create = ;

		_this[ essenceMeta ].getPublicArr = function(arr, fields){
			var result = [];
			for(var i=0; i<arr.length; i++){
				var publicEssence = arr[i].getPublic(fields);
				result.push(publicEssence);
			}
			return result;
		};
		
		['Add', 'Save'].forEach(function (operation) {
			_this[essenceMeta]['before' + operation] =
			(config[essenceMeta]['before' + operation] != undefined) 
				? config[essenceMeta]['before' + operation]
				: _this.defaultBeforeDBCallback;
				
			_this[essenceMeta]['after' + operation] =
			(config[essenceMeta]['after' + operation] != undefined) 
				? config[essenceMeta]['after' + operation] 
				: _this.defaultAfterDBCallback;
		});
	}

	return this;
}
