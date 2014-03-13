var pg = require('pg');
var jquery = require('jquery');

var dbLabmda;

var Essence = function(meta, params) {
	this.meta = meta;

	for(var property in meta.fields){
		this[property] = params[property];
	}
}

Essence.init = function(dbLabmdaFunc) {
	dbLabmda = dbLabmdaFunc;
}

Essence.get = function(meta, params, done) {
	console.log('Start get ' + meta.name, params);

	var whereClause;
	var whereParams;

	if(meta.where){
		var where = meta.where(params);
		whereClause = where.clause;
		whereParams = where.params;
	}
	else{
		var i = 1;
		whereParams = [];

		for(var whereParam in params){
			whereClause = (whereClause ? ' AND ' : ' WHERE ') + whereParam + ' = $' + i.toString();
			whereParams.push(params[whereParam]);
			i++;
		}	
	}

	var selectFields = '';
	for(var property in meta.fields){
		selectFields += (selectFields.length > 0 ? ', ' : '') + property;
	}

	dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		var queryString = 'SELECT '+ selectFields +' FROM "' + meta.name + '"' + (whereClause || '');

		console.log(queryString, whereParams);
		client.query(queryString, whereParams, function(err, result) {
			doneDB();
			if(err){ console.error('Cant select ' + meta.name, err); done('DB_ERROR'); return; }

			var essences = [];

			for(var i=0; i<result.rows.length; i++){
				essences.push( new Essence(meta, result.rows[i]) );
			}

			console.info('Getted '+ meta.name, essences.length);
			done && done(err, essences);
		});
	});
}

Essence.prototype.save = function(done) {
	var _this = this;

	dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		if(_this.id){ // update
			console.info('Start update ', _this.meta.name);
		
			var updateFields = '';
			var i = 2;
			var updateParams = [ _this.id ];

			for(var property in _this.meta.fields){
				if(property == 'id' || property == 'created') continue;

				updateFields += (updateFields.length > 0 ? ', ' : '') + property + '=$' + i.toString();
				updateParams.push(_this[property]);
				i++;
			}

			var updateString = 'UPDATE "'+ _this.meta.name +'" SET '+ updateFields +' WHERE id=$1';

			console.log(updateString, updateParams);
			client.query(updateString, updateParams, function(err, result) {
				doneDB();
				if(err){ console.error('Cant update '+_this.meta.name, err); done('DB_ERROR'); return; }

				console.info('Updated', _this.meta.name);
				done && done(null, _this);
			});
		}
		else{ // insert
			console.info('Start insert ', _this.meta.name);

			var insertFields = '';
			var insertValues = '';
			var i = 1;
			var insertParams = [];

			for(var property in _this.meta.fields){
				if(property == 'id' || property == 'created') continue;

				insertFields += (insertFields.length > 0 ? ', ' : '') + property;
				insertValues += (insertValues.length > 0 ? ', ' : '') + '$' + i.toString();
				insertParams.push(_this[property]);
				i++;
			}

			client.query('INSERT INTO "' + _this.meta.name + '" (' + insertFields + ') VALUES (' + insertValues +') RETURNING id', insertParams, function(err, result) {
				doneDB();
				if(err){ console.error('Cant insert ' + _this.meta.name, err); done('DB_ERROR'); return; }

				_this.id = result.rows[0].id;
				console.info('Inserted', _this.meta.name);
				done && done(err, _this);
			});
		}
		
	});
};

Essence.prototype.delete = function(done) {
	var _this = this;

	dbLabmda(function(err, client, doneDB) {
		if(err){ console.error(err); doneDB(); done('DB_ERROR'); return; }

		console.info('Start delete ', _this.meta.name);

		client.query('DELETE FROM "' + _this.meta.name + '" WHERE id = $1', [_this.id], function(err, result) {
			doneDB();
			if(err){ console.error('Cant delete ' + _this.meta.name, err); done('DB_ERROR'); return; }

			console.info('Deleted', _this.meta.name);
			done && done(err, _this);
		});
		
	});
};

module.exports = Essence;
