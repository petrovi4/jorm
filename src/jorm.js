var pg = require('pg');
var extend = require('extend');
var async = require('async');

module.exports = function(jormParams, config) {
	var essence = require('./essence');

	this.connectionString = (typeof jormParams == 'string' ? jormParams : jormParams.connectionString);
	this.logSQL = jormParams.logSQL != null ? jormParams.logSQL : true;
	this.log = jormParams.log != null ? jormParams.log : true;
	
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

	extend(this, config);

	for(var essenceMeta in this){
		extend( _this[ essenceMeta ], essence );

		_this[ essenceMeta ].name = essenceMeta;
		_this[ essenceMeta ].jorm = _this;

		_this[ essenceMeta ].create = function (params) {
			return new essence(this, params || {});
		};

		// this[ essenceMeta ].get = function (params, done) {
		// 	essence.get( this, params, done );
		// };

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
