import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postgresAdapter,postgresConfig} from '../backend/database.mjs';

test('PostgreSQL 适配保留参数绑定、读取结果及条件更新的行数',async()=>{
 const calls=[],pool={async connect(){return {async query(sql,params){calls.push({sql,params});return {rows:[{id:'one'}],rowCount:1}},release(){calls.push({released:true})}}},async end(){calls.push({closed:true})}},db=postgresAdapter(pool);
 assert.equal((await db.prepare('SELECT id FROM rooms WHERE id=? AND expires>?').get('one',123)).id,'one');
 assert.equal(calls[0].sql,'SET search_path TO recall_app');
 assert.deepEqual(calls[1],{sql:'SELECT id FROM rooms WHERE id=$1 AND expires>$2',params:['one',123]});assert.ok(calls[2].released);
 assert.deepEqual(await db.prepare('SELECT id FROM rooms').all(),[{id:'one'}]);
 assert.equal((await db.prepare('UPDATE rooms SET guest_id=? WHERE id=? AND guest_id IS NULL').run('guest','one')).changes,1);
 await db.exec('CREATE SCHEMA IF NOT EXISTS recall_app');await db.close();assert.ok(calls.at(-1).closed);
});

test('数据库连接强制验证 TLS 证书，并隔离应用表的 schema',()=>{
 const config=postgresConfig('postgresql://test:fake@pool.example:5432/postgres?sslmode=no-verify&options=unsafe','root-certificate');
 assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.ca,'root-certificate');
 assert.equal(config.max,3);
 assert.ok(!config.connectionString.includes('sslmode'));assert.ok(!config.connectionString.includes('options='));
 assert.equal(postgresConfig('postgresql://test:fake@pool.example/postgres').ssl.rejectUnauthorized,true);
 assert.throws(()=>postgresConfig('https://example.com'));
});

test('数据库查询失败时归还连接，避免免费连接池耗尽',async()=>{
 let released=false;const db=postgresAdapter({async connect(){return {async query(sql){if(sql.startsWith('SELECT'))throw Error('offline')},release(){released=true}}}});
 await assert.rejects(db.prepare('SELECT 1').get(),/offline/);assert.ok(released);
});
