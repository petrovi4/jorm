var pg = require('pg');
var extend = require('extend');
var async = require('async');
var Memcached = require('memcached');

Array.prototype.getPublic = function() {
	var publicArr = [];
	for(var i=0; i<this.length; i++){
		if(this[i].getPublic){
			publicArr.push(this[i].getPublic());
		}
	}
	return publicArr;
}

module.exports = function(jormParams, config) {
	var essence = require('./essence');

	this.connectionString = (typeof jormParams == 'string' ? jormParams : jormParams.connectionString);
	this.logSQL = jormParams.logSQL != null ? jormParams.logSQL : true;
	this.log = jormParams.log != null ? jormParams.log : true;
        
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
		}
	}

	return this;
}
