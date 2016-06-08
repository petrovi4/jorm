var sql = require('sql');
sql.setDialect('postgres');


var user = sql.define({
	name: 'user',
	columns: ['id', 'name', 'email', 'lastLogin']
});

var post = sql.define({
	name: 'post',
	columns: ['id', 'user_id', 'created', 'text']
});

var query = user.select('id', 'COALESCE((SELECT count(*) FROM "post" WHERE "post".user_id = "user".id),0) as asd').where(user.id.equals(3))

// var user_post = user.as('user_post');
// var post_alias = post.as('xxx');

// var sub_query = user
// 	.leftJoin(post_alias).on(user.id.equals(post_alias.user_id))
// 	.leftJoin(user_post).on(post_alias.user_id.equals(user_post.id));

// var query = user.select([user.id.as('qqq.id'), user.name.as('qqq.name'), post_alias.created.as('xxx.created') ]).from(sub_query);

// var text = user['select'](['a', 's']).toQuery();

// var query = user.update({
// 	name: 'Alex',
// 	email: 'qwe@asd.com'
// }).toQuery();

// var query = user.delete().where(user['id'].equals(1))

console.log(query.toQuery());