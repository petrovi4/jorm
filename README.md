jorm
====

Simple orm - just orm.

## Init

Just init jorm parameters:
```javascript
var jormParams = {
	connectionString: "postgres://user:password@server.com:5432/base", // required
	logger: custom_logger, // optional object with log, error, warn and info methods
}
```

db config:
```javascript
var config = {
	User: {
		table: 'user',
		fields: {
			id			: {pk: true}, // this is primary key to CRUD operations
			created		: {default: function(params){ return new Date() }}, // field allows auto init default values
			name		: {public: true}, // this field will be in public object by .getPublic() method
			hpassword	: {},
			email		: {public: 'light'}, // this field will be in public object by .getPublic() and .getPublic('light') method
			phone		: {public: ['light', 'full']}, // this field will be in public object by .getPublic(), .getPublic('light') and .getPublic('full') method
			is_alex		: {db: false, default: function(params){ return params.name == 'Alex' }}, // this field will be ignored in all db CRUD operations, but will be filled while user object created
			post_count_cache: {sql: 'COALESCE(post_count_cache, 0)'}, // custom sql part for select column post_count_cache
			comments_count: { db: 'demand', sql: 'COALESCE((SELECT count(*) FROM comment WHERE comment.user_id = "user".id),0)' }, // this field including in query only by demand
		},

		// Optional possible DB triggers - all combinations of 'select', 'insert', 'update', 'delete' commands, and 'after', 'before', 'error' events
		select_before	: function(client, callback) { callback(); },
		insert_after	: function(client, dataFromDB, callback){ callback(null, dataFromDB); },
		delete_error	: function(err, callback) { callback(); },

		init 			: function() {this.hpassword = someFuncToHashPass(this.email, this.password)} // called after object created
	}
};
```

and init jorm:
```javascript
var jorm = require('jorm');
var dto = new jorm(jormParams, config);
```

# CRUD
## Create
```javascript
var newUser = jorm.User.create({name: 'John', email: 'john@connor.com'})
```

## Save

If object's primary key field is *null* or *undefined*, then make *insert*. Else make *update*

```javascript
newUser.save(function(err, user){
	if(err) return console.error(err);
	console.log(user.getPublic());
});
```

## Update

```javascript
user.name = newName;
user.save(function(err, user){
	if(err) return console.error(err);
	console.log(user.getPublic());
});
```

## Delete
Just delete it
```javascript
user.delete(function(err){
	if(err) return console.error(err);
	console.log('deleted');
})
```

## Get it from DB

### Simple get by field
```javascript
jorm.User.get({
	id: userId // simple 'where' by id
}, function(err, users) {
	if(err) return console.error(err);
	if(users.length == 0)return console.log('UNKNOWN_USER_ID');
	
	console.log(users[0].getPublic());
})
```


### Custom get by fields

```javascript
jorm.User.get({
	name 				:{comparsion: 'LIKE', value: '%a%'}, // 'where' by custom comparsion
	age_xyz				:{columns: ['age'], comparsion: '>', value: 20},	// 'columns' fields override key,  ...
	any_field			:{comparsion: 'LIKE', columns: ['name','description'], value: '%b%'} // LIKE over name+description with "OR" clause
	post_count			: [1,2,3] // 'in' clause
	gender				: ['m','f', null] // => gender in ('m','f') or gender is null
}, {
	fields: ['id', 'name'] // get from db only this fields
	},function(err, users) {
	if(err) return console.error(err);
	console.log(users.getPublic()); // getPublic() work for arrays too
})
```


### Order, Limit and Offset 

```javascript
jorm.User.get({
	// empty fields params must be specified
	}, {
	demand: ['comments_count'], // get all fields from User, and 'demand' fields
	limit: 10,
	offset: 100,
	order: {field: 'id', direction: 'asc'} // asc - default value for direction
}, function(err, users) {
	if(err) return console.error(err);
	console.log(users.getPublic());
})
```


### Join essences

Simple join table with minimum options
```javascript
jorm.Post.get({
	},{
	join: [
		{join: dto.User, field: 'id', parent_field: 'user_id'}
	]}, function(err, posts){
	if(err) return console.error(err);
	console.log(posts.getPublic()); // each post contains user creator
});
```

Join same table twice (join to joined table)
```javascript
jorm.Post.get({

	},{
	join: [
		{join: dto.User, to:dto.Post, field: 'id', right_field: 'user_id'},
		{join: dto.Comment, left_field: 'id', right_field: 'user_id'}, // if 'to' omitted, main essence implied (Post in this example)
		{join: dto.User, to:dto.Comment, field: 'id', right_field: 'user_id'}
	]}, function(err, posts){
	if(err) return console.error(err);
	console.log(posts.getPublic()); // each post contains User and Comment fields, each Comment contains User itself
});
```




v2
=========================
v1





## Defining and overriding methods in model

In this example model 'user':
- has additional method getHPassword
- override default method 'getPublic'
- override default initialization method 'init'
- override default method to get param for 'where' clause 
- override fields for 'select' clause

```javascript
var userModel = {
	table: 'user',
	fields:{
		id 							: {},
		email						: {},
		hpassword					: {},
		name						: {},
		surname						: {},
		birthdate					: {},
	},
	init: function (params) {
		if(params.password){
			this.hpassword = this.getHPassword(this.email, params.password, 'salt_example');
		}
	},
	getHPassword: function (login, password, salt) {
		var hpassword = crypto.createHash('sha1').update(login + password + salt).digest('hex');
		return hpassword;
	},
	getPublic: function(){
		var publicDto = this.getPublicInternal();
		delete publicDto.hpassword;
		return publicDto;
	},
	whereParam: function(prefix, param, value, index) {
		if(param != 'addCommentsCount'){
			return this.whereParamInternal(prefix, param, value, index);
		}
	},
	selectFields: function(params, prefix) {
		var selectFields = this.selectFieldsInternal(params, prefix);
		if(params.addCommentsCount){
			selectFields += ', (select COUNT(*) from comment where comment.post_id = post.id) as commentsCount';
		}
		return selectFields;
	}
}
```
