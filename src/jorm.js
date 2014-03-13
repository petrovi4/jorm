var pg = require('pg');

var essence = require('./essence');

exports.create = function(connectionString, config) {
	essence.init(function (executeInDBScope) {
		pg.connect(connectionString, function(err, client, donePG) {
			if(err){ console.error(err); donePG(); done('DB_ERROR'); return; }
			console.log('Connected to PG');

			executeInDBScope(err, client, donePG);
		});
	});

	for(var essenceMeta in config){

		this[ essenceMeta ] = { 
			meta: config[ essenceMeta ],
			create: function (params) {
				return new essence(config[ essenceMeta ], params)
			},
			get: function (params, done) {
				essence.get( config[ essenceMeta ], params, done );
			}
		}
	}

	console.log(this);
	return this;
}
