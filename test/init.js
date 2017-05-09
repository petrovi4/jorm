var jorm = require('../src/jorm');

function _before (params, client, callback) {
	if(params.handlers){
		params.name_to_check_before = (new Date()).getTime() + '_before';
		client.query('INSERT INTO "user"(name) values($1)', [params.name_to_check_before], function(err) {
			callback(err);
		});
	}
	else callback();
}
function _after (params, client, dataFromDB, callback) {
	if(params.handlers){
		params.name_to_check_after = (new Date()).getTime() + '_after';
		client.query('INSERT INTO "user"(name) values($1)', [params.name_to_check_after], function(err) {
			callback(err, dataFromDB);
		});
	}
	else callback(null, dataFromDB);
}
function _error (err, params, client, callback) {
	if(params.handlers){
		params.name_to_check_error = (new Date()).getTime() + '_error';
		client.query('INSERT INTO "user"(name) values($1)', [params.name_to_check_error], function(err) {
			callback(err);
		});
	}
	else callback();
}


var config = {

	User: {
		table  : 'user',
		fields : {
			id								: { pk: true, public: true },
			created						: { default: function(){ return new Date(); } },
			name							: { public: ['lite', 'admin'] },
			email							: { public: 'admin' },
			hpassword					: {},
			password					: { db: false },
			post_count_cache	: { db: ['select','update'], default: 0, sql: 'COALESCE("user"."post_count_cache", 0)' },
			comments_count		: { db: 'demand', sql: 'COALESCE((SELECT count(*) FROM "comment" WHERE "comment"."user_id" = "user"."id"),0)' },
			link							: { public: true, db:false, getPublic: function(_this) { return 'href://site.com/user/'+_this.id; } }
		},
		init					: function() { if(!this.hpassword) this.hpassword = this.email+this.password; },
		
		select_before : _before,
		select_after : _after,
		select_error : _error,

		insert_before : _before,
		insert_after : _after,
		insert_error : _error,

		update_before : _before,
		update_after : _after,
		update_error : _error,
	},

	Post: {
		table  : 'post',
		fields : {
			id							: { pk: true, public: true },
			created					: { default: function(){ return new Date(); } },
			user_id					: { public: ['lite'] },
			text						: { public: true },
			comments_count	: { db: 'demand', default: 0 },
		},
	},

	Comment: {
		table  : 'comment',
		fields : {
			id							: { pk: true, public: true },
			created					: { default: function(){ return new Date(); } },
			post_id					: { public: ['lite'] },
			user_id					: { public: ['lite'] },
			text						: { public: true }
		},
	},

	NotExisting: {
		table		: 'not_existing',
		fields	: {
			id							: {},
			name						: {}
		},

		select_before : _before,
		select_after : _after,
		select_error : _error,

		insert_before : _before,
		insert_after : _after,
		insert_error : _error,

		update_before : _before,
		update_after : _after,
		update_error : _error,
	}

};

var dto = new jorm({
	connectionString: 'postgres://jorm_test_user:jorm_test_user_pass@localhost:5432/jorm_test',
	logger: console
}, config);

module.exports = dto;