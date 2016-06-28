
-- ----------------------------
--  Sequence structure for comment_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "comment_id_seq" CASCADE;
CREATE SEQUENCE "comment_id_seq" INCREMENT 1 START 5 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;

-- ----------------------------
--  Sequence structure for post_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "post_id_seq" CASCADE;
CREATE SEQUENCE "post_id_seq" INCREMENT 1 START 5 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;

-- ----------------------------
--  Sequence structure for user_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "user_id_seq" CASCADE;
CREATE SEQUENCE "user_id_seq" INCREMENT 1 START 4 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;

-- ----------------------------
--  Table structure for comment
-- ----------------------------
DROP TABLE IF EXISTS "comment" CASCADE;
CREATE TABLE "comment" (
	"id" int4 NOT NULL DEFAULT nextval('comment_id_seq'::regclass),
	"created" timestamp(6) NOT NULL DEFAULT now(),
	"post_id" int4 NOT NULL,
	"user_id" int4 NOT NULL,
	"text" varchar NOT NULL COLLATE "default"
)
WITH (OIDS=FALSE);

-- ----------------------------
--  Records of comment
-- ----------------------------
BEGIN;
INSERT INTO "comment" VALUES ('1', '2016-05-29 03:06:16.408459', '2', '2', 'Hi, dude!');
INSERT INTO "comment" VALUES ('2', '2016-05-29 03:06:38.815895', '2', '1', 'I''am glad to see you!');
INSERT INTO "comment" VALUES ('3', '2016-05-29 03:07:21.861764', '3', '3', 'I''am here too');
INSERT INTO "comment" VALUES ('4', '2016-05-29 03:07:42.095618', '3', '1', 'Nice )');
COMMIT;

-- ----------------------------
--  Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS "user" CASCADE;
CREATE TABLE "user" (
	"id" int4 NOT NULL DEFAULT nextval('user_id_seq'::regclass),
	"created" timestamp(6) NOT NULL DEFAULT now(),
	"name" varchar COLLATE "default",
	"email" varchar COLLATE "default",
	"hpassword" varchar COLLATE "default",
	"post_count_cache" int4
)
WITH (OIDS=FALSE);

-- ----------------------------
--  Records of user
-- ----------------------------
BEGIN;
INSERT INTO "user" VALUES ('1', '2016-05-29 03:03:26.345506', 'Alex', 'alex@server.com', 'qweqwe', 2);
INSERT INTO "user" VALUES ('2', '2016-05-29 03:03:41.949489', 'John', 'john@server.com', 'asdasd', 1);
INSERT INTO "user" VALUES ('3', '2016-05-29 03:03:59.171153', 'Vika', 'vika@server.com', 'zxczxc', 1);
INSERT INTO "user" VALUES ('4', '2016-05-29 03:04:13.434234', 'Boby', 'boby@server.com', 'dfgdfg');
COMMIT;

-- ----------------------------
--  Table structure for post
-- ----------------------------
DROP TABLE IF EXISTS "post" CASCADE;
CREATE TABLE "post" (
	"id" int4 NOT NULL DEFAULT nextval('post_id_seq'::regclass),
	"created" timestamp(6) NOT NULL DEFAULT now(),
	"user_id" int4 NOT NULL,
	"text" varchar COLLATE "default"
)
WITH (OIDS=FALSE);

-- ----------------------------
--  Records of post
-- ----------------------------
BEGIN;
INSERT INTO "post" VALUES ('1', '2016-05-29 03:04:24.080025', '1', 'Hellow, World!');
INSERT INTO "post" VALUES ('2', '2016-05-29 03:04:39.064894', '1', 'Hey, man ;)');
INSERT INTO "post" VALUES ('3', '2016-05-29 03:04:55.28688', '2', 'I''am here!');
INSERT INTO "post" VALUES ('4', '2016-05-29 03:05:24.553474', '3', 'Is anybody here?');
COMMIT;


-- ----------------------------
--  Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "comment_id_seq" RESTART 6 OWNED BY "comment"."id";
ALTER SEQUENCE "post_id_seq" RESTART 6 OWNED BY "post"."id";
ALTER SEQUENCE "user_id_seq" RESTART 5 OWNED BY "user"."id";
-- ----------------------------
--  Primary key structure for table comment
-- ----------------------------
ALTER TABLE "comment" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Primary key structure for table user
-- ----------------------------
ALTER TABLE "user" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Primary key structure for table post
-- ----------------------------
ALTER TABLE "post" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

