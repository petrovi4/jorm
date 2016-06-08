var jorm = require('../src/jorm');

var config = {

	User: {
		table  : 'user',
		fields : {
			id								: { pk: true, public: true },
			created						: { default: function(params){ return new Date() } },
			name							: { public: ['full', 'admin'] },
			email							: { public: 'admin' },
			hpassword					: {},
			password					: { db: false },
			post_count_cache	: { db: ['select','update'], default: 0, sql: 'COALESCE(post_count_cache, 0)' },
			comments_count		: { db: 'demand', sql: 'COALESCE((SELECT count(*) FROM comment WHERE comment.user_id = "user".id),0)' },
		},
		init					: function() { if(!this.hpassword) this.hpassword = this.email+this.password },
	},

	Post: {
		table  : 'post',
		fields : {
			id							: { pk: true, public: true },
			created					: { default: function(params){ return new Date() } },
			user_id					: { public: ['full'] },
			text						: { public: true },
			comments_count	: { db: 'select', default: 0 },
		},
	},

	Comment: {
		table  : 'comment',
		fields : {
			id							: { pk: true, public: true },
			created					: { default: function(params){ return new Date() } },
			post_id					: { public: ['full'] },
			user_id					: { public: ['full'] },
			text						: { public: true },
		},
	},

}

var dto = new jorm({
	connectionString: "postgres://jorm_test_user:jorm_test_user_pass@localhost:5432/jorm_test",
	logger: console
}, config);

module.exports = dto;