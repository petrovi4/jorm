var pg = require('pg');
var extend = require('extend');
var async = require('async');
var Memcached = require('memcached');

module.exports = function(jormParams, config) {
	var essence = require('./essence');

	this.connectionString = (typeof jormParams == 'string' ? jormParams : jormParams.connectionString);
	this.logSQL = jormParams.logSQL != null ? jormParams.logSQL : true;
	this.log = jormParams.log != null ? jormParams.log : true;
	
	this.defaultBeforeDBCallback = function (err, client, callback) {
		callback();
	};
	
	this.defaultAfterDBCallback = function (err, client, doneDB) {
		doneDB();
	}
        
	this.useCache = (jormParams.cache != null);
	this.memcache = (jormParams.cache);
	
	// console.log('connectionString', this.connectionString);
	// console.log('logSQL', this.logSQL);

	var _this = this;
	this.dbLabmda = function (executeInDBScope) {
		pg.connect(_this.connectionString, function(err, client, donePG) {
			if(err){ console.error(err); donePG(); executeInDBScope('DB_ERROR'); return; }
			if(_this.log) console.log('Connected to PG');

			executeInDBScope(err, client, donePG);
		});
	};
	
	this.dbLambdaForSave = function (context, callback) {
		_this.dbLabmda(function(err, client, doneDB) {
			context.beforeSave(err, client, function () {
				callback(
					err, 
					client, 
					function () {
						context.afterSave(err, client, doneDB); 
					}
				);
			});
		});
	};
	
	this.dbLambdaForAdd = function (context, callback) {
		_this.dbLabmda(function(err, client, doneDB) {
			context.beforeAdd(err, client, function () {
				callback(
					err, 
					client, 
					function () {
						context.afterAdd(err, client, doneDB); 
					}
				);
			});
		});
	};

	for(var essenceMeta in config){
		console.log('essenceMeta', essenceMeta);

		_this[ essenceMeta ] = extend( {}, essence, config[ essenceMeta ] );

		_this[ essenceMeta ].name = essenceMeta;
		_this[ essenceMeta ].jorm = _this;

		_this[ essenceMeta ].create = function (params) {
			return new essence(this, params || {});
		};

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
