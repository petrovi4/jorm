--
-- please restore this dump BEFORE running tests
-- cat db.sql | psql -U jorm_test jorm_test
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: child_1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE child_1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: child_1; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE child_1 (
    id integer DEFAULT nextval('child_1_id_seq'::regclass) NOT NULL,
    name_child character varying,
    created timestamp without time zone DEFAULT now() NOT NULL,
    parent_1_id integer
);


--
-- Name: parent_1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE parent_1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parent_1; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE parent_1 (
    id integer DEFAULT nextval('parent_1_id_seq'::regclass) NOT NULL,
    name character varying,
    created timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: child_1; Type: TABLE DATA; Schema: public; Owner: -
--

COPY child_1 (id, name_child, created, parent_1_id) FROM stdin;
1	nameChild1	2014-04-28 11:43:55.52589	1
2	nameChild1	2014-04-28 11:44:10.81504	1
\.


--
-- Name: child_1_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('child_1_id_seq', 1, false);


--
-- Data for Name: parent_1; Type: TABLE DATA; Schema: public; Owner: -
--

COPY parent_1 (id, name, created) FROM stdin;
1	test1	2014-04-28 11:40:39.414334
\.


--
-- Name: parent_1_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('parent_1_id_seq', 20, true);


--
-- Name: child_1_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY child_1
    ADD CONSTRAINT child_1_pkey PRIMARY KEY (id);


--
-- Name: parent_1_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY parent_1
    ADD CONSTRAINT parent_1_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

