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
			name		: {public: true}, // this field will be in public object by .getPublic() method with any parameter
			hpassword	: {},
			email		: {public: 'lite'}, // this field will be in public object by .getPublic() and .getPublic('lite') method
			phone		: {public: ['lite', 'full']}, // this field will be in public object by .getPublic(), .getPublic('lite'), .getPublic('full') and .getPublic('lite','anyOther') methods
			is_alex		: {db: false, default: function(params){ return params.name == 'Alex' }}, // this field will be ignored in all db CRUD operations, but will be filled while user object created
			post_count_cache: {sql: 'COALESCE(post_count_cache, 0)'}, // custom sql part for select column post_count_cache
			comments_count: { db: 'demand', sql: 'COALESCE((SELECT count(*) FROM "comment" WHERE "comment"."user_id" = "user"."id"),0)' }, // this field including in query only by demand. All tables and columns must be with quotes (")
			current_geo_id: {public:true, alias:'GeoCurrent'},
			birth_geo_id  : {public:true, alias:'GeoBirth'} // specify alias to separete fields in get request with joined objects
		},

		// Optional possible DB triggers - all combinations of 'select', 'insert', 'update', 'delete' commands, and 'after', 'before', 'error' events
		select_before	: function(params, client, callback){
			if(params.make_ext_request){ // make_ext_request - just for example
				// ... make some action, incl. sql request with [client] ...
				callback(err)
			}
			else callback();
		};
		insert_after	: function(params, client, dataFromDB, callback){
			if(params.make_ext_request){ // make_ext_request - just for example
				// ... make some action, incl. sql request with [client] ...
				callback(null, dataFromDB)
			};
			else callback(null, dataFromDB); 
		},
		update_error	: function(err, params, client, callback){
			if(params.make_ext_request){ // make_ext_request - just for example
				// ... make some action, incl. sql request with [client] ...
				callback(err)
			};
			else callback(err); 
		},

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

*save* and *delete* supports optional *params*, which will be transfered to handlers

```javascript
newUser.save(function(err, user){
	if(err) return console.error(err);
	console.log(user.getPublic());
});
// or
newUser.save({make_ext_request: true}, callback);
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
// or
user.delete({make_ext_request: true});
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
	email 				:{comparsion: 'is not null'}, // 'is null' comparsion
	phone 				:{comparsion: 'is null'}, // 'is not null' comparsion
	age_xyz				:{columns: ['age'], comparsion: '>', value: 20},	// 'columns' fields override key,  ...
	any_field			:{comparsion: 'LIKE', columns: ['name','description'], value: '%b%', and_or: 'OR'} // LIKE over name+description with "OR" clause
	post_count			: [1,2,3] // 'in' clause
	gender				: ['m','f', null] // => gender in ('m','f') or gender is null
}, {
	and_or: 'or',	// where by fields with 'OR' clause
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
	order: [
		{field: 'id'},
		{dto: dto.User, field: 'id'}
	], // Order can be defined multiply times and can be over joined dto too
	join: [
		{join: dto.User, field: 'id', parent_field: 'user_id'}
	]}, function(err, posts){
	if(err) return console.error(err);
	console.log(posts.getPublic()); // each post contains user creator
});
```

Join same table twice (join to joined table) with WHERE cluase by two tables
```javascript
jorm.Post.get({
		created: {comparsion: '>', value: new Date()}
	},{
	join: [
		{join: dto.User, to:dto.Post, field: 'id', parent_field: 'user_id'},
		{join: dto.Comment, field: 'id', parent_field: 'user_id'}, // if 'to' omitted, main essence implied (Post in this example)
		{join: dto.User, to:dto.Comment, field: 'id', parent_field: 'user_id', where: {created: {comparsion: '>', value: new Date()}} }
	]}, function(err, posts){
	if(err) return console.error(err);
	console.log(posts.getPublic()); // each post contains User and Comment fields, each Comment contains User itself
});
```

#CRUD Handlers
Each CRUD function can be wrapped with *before* and *after* handler.

Additionaly, parameter {transaction: true} for get, save and delete make handlers transaction safe.

```javascript
var config = {
	User: {
		table: 'user',
		fields: {
		},
		insert_before	: function(params, client, callback) { 
			client.query('INSERT INTO "trace_log"(entry) values($1)', ["this_log_for_test_transactions"], function(err) {
				callback(err);
			});
		},
	}
};
// ...
var user = dto.User.create();
user.save({transaction: true}, function(err, user){
	// if inserting this user fails, no trace log entry added in insert_before because of automatic rollback transaction in error handler
})
```


#Tests
See 'test' folder

