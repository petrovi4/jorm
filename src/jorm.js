var pg = require('pg');
var extend = require('extend');

var essence = require('./essence');

exports.create = function(connectionString, config) {
	essence.init(function (executeInDBScope) {
		pg.connect(connectionString, function(err, client, donePG) {
			if(err){ console.error(err); donePG(); done('DB_ERROR'); return; }
			console.log('Connected to PG');

			executeInDBScope(err, client, donePG);
		});
	});

	extend(this, config);

	for(var essenceMeta in this){

		this[ essenceMeta ].create = function (params) {
			return new essence(this, params)
		};

		this[ essenceMeta ].get = function (params, done) {

			// console.log('essenceMeta', essenceMeta);
			// console.log('this', this);
			essence.get( this, params, done );
		}

	}

	return this;
}
