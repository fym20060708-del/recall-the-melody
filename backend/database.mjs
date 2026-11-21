import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
// Application queries contain only parameter placeholders, never interpolated user input.
export function postgresSql(sql){let index=0;return sql.replace(/\?/g,()=>`$${++index}`)}
export function postgresAdapter(pool){
 // Explicit SET works with session poolers that ignore startup search_path options.
 async function query(sql,args){const client=await pool.connect();try{await client.query('SET search_path TO recall_app');return await client.query(sql,args)}finally{client.release()}}
 return {kind:'postgres',async exec(sql){await query(sql)},prepare(sql){const sqlWithParams=postgresSql(sql);return {async get(...args){return (await query(sqlWithParams,args)).rows[0]},async all(...args){return (await query(sqlWithParams,args)).rows},async run(...args){const r=await query(sqlWithParams,args);return {changes:r.rowCount}}}},close:()=>pool.end()}
}
export function postgresConfig(connectionString,ca){const url=new URL(connectionString);if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('DATABASE_URL must be a PostgreSQL connection string');for(const key of ['sslmode','sslcert','sslkey','sslrootcert','options'])url.searchParams.delete(key);return {connectionString:url.toString(),max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,ssl:{rejectUnauthorized:true,...(ca?{ca}:{} )}}}
export async function openDatabase({databasePath=':memory:',databaseUrl='',databaseCa=''}={}){if(databaseUrl){const {default:pg}=await import('pg');pg.types.setTypeParser(20,Number);const pool=new pg.Pool(postgresConfig(databaseUrl,databaseCa));pool.on('error',()=>console.error('Database connection temporarily unavailable'));const db=postgresAdapter(pool);try{await db.exec('CREATE SCHEMA IF NOT EXISTS recall_app');await db.exec('REVOKE ALL ON SCHEMA recall_app FROM PUBLIC')}catch(e){await db.close();throw e}return db}if(databasePath!==':memory:')mkdirSync(dirname(databasePath),{recursive:true});const db=new DatabaseSync(databasePath);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');return {kind:'sqlite',exec:sql=>db.exec(sql),prepare:sql=>db.prepare(sql),close:()=>db.close()}}
