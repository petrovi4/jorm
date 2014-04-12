jorm
====

Simple orm - just orm.

## Init

Just init connectionString

```javascript
var connectionString = "postgres://user:password@server.com:5432/base";
```

db config
```javascript
var config = {
	User: {
		table: 'user',
		fields: {
			id					: {},
			created			: {},
			name				: {},
			hpassword		: {},
			email				: {},
			phone				: {}
		}
	}
};
```

and init jorm
```javascript
var jormModule = require('jorm');
jorm = new jormModule(connectionString, config);
```

# CRUD
## Create
```javascript
var newUser = jorm.User.create({name: 'John', email: 'john@connor.com'})
newUser.hpassword = someFuncToHashPass(login, password);
```

## Save
```javascript
newUser.save(function(err, user){
	if(err){ console.error(err); return; }
	console.log(user.getPublic());
});
```

## Update

essence.id == null -> make insert

essence.id != null -> make update

```javascript
user.name = newName;
user.save(function(err, user){
	if(err){ console.error(err); return; }
	console.log(user.getPublic());
});
```

## Delete
Just delete it
```javascript
user.delete(function(err){
	if(err){ console.error(err); return; }
	console.log('deleted');
})
```

## Get it from DB
Simple get
```javascript
jorm.User.get({id: userId}, function(err, users) {
	if(err){ console.error(err); res.send({errCode: 'INTERNAL_ERROR'}); return; }
	if(users.length == 0){ res.send({errCode: 'UNKNOWN_USER_ID'}); return; }

	res.send(users[0].getPublic());
})
```

### Order, Limit and Offset 

```javascript
var params = {
	limit: 10,
	offset: 100,
	'order by desc': 'created'
};

jorm.User.get(params, function(err, users) {
	if(err){ console.error(err); res.send({errCode: 'INTERNAL_ERROR'}); return; }
	if(users.length == 0){ res.send({errCode: 'UNKNOWN_USER_ID'}); return; }

	res.send(jorm.User.getPublicArr(users));
})
```

### Search with 'like'

```javascript
jorm.User.get({search: {columns: ['name', 'surname'], value: '%'+req.param('search').toLowerCase()+'%'} }, function(err, users){
	if(err){ console.log(err); res.send({errCode: 'INTERNAL_ERROR'}); return; }
	res.send( jorm.User.getPublicArr(users) );
});
```


### Join essences

Multiple join with "where" clause for joined table

```javascript
var params = {
	id: parseInt(req.param('id')),
	join: [
		{essence: 'Comment', field: 'id', joinField: 'post_id', where: {is_public: 1}},
		'User'
	]
};

jorm.Post.get(params, function(err, posts){
	if(err){ console.log(err); res.send({errCode: 'INTERNAL_ERROR'}); return; }

	if(posts.length == 0){ res.send({errCode: 'UNKNOWN_POST_ID'}); return; }

	res.send( jorm.Post.getPublicArr(posts) );
});
```

In this example table "post" has field user_id, and table user joined by field id.
Table "comment" joining with custom join configuration.