import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(session({ secret:'dev-secret', resave:false, saveUninitialized:false }));
app.use(express.static(path.join(__dirname,'../../public')));

const users = []; // {id,email,passHash,role,profiles:[{id,name,avatarUrl}]}
const titles = [];
const genres = [{name:'Action',slug:'action'},{name:'Drama',slug:'drama'},{name:'Kids',slug:'kids'}];

(async function seed(){
  if(!users.find(u=>u.email==='admin@example.com')){
    users.push({ id:nanoid(), email:'admin@example.com', passHash: await bcrypt.hash('admin123',10), role:'admin', profiles:[{id:nanoid(),name:'Main',avatarUrl:'/images/avatar1.png'}]});
  }
  const id1 = nanoid(); titles.push({ id:id1, type:'movie', name:'Demo Movie', year:2024, genres:['action'], description:'A demo movie.', posterUrl:'/images/mainscreen.jpeg', videoUrl:'https://samplelib.com/lib/preview/mp4/sample-5s.mp4' });
  const id2 = nanoid(); titles.push({ id:id2, type:'series', name:'Demo Series', year:2023, genres:['drama'], description:'A demo series.', posterUrl:'/images/disney-interface.jpeg', episodes:[
    { id:nanoid(), season:1, episodeNumber:1, name:'Pilot', videoUrl:'https://samplelib.com/lib/preview/mp4/sample-5s.mp4' },
    { id:nanoid(), season:1, episodeNumber:2, name:'Next', videoUrl:'https://samplelib.com/lib/preview/mp4/sample-5s.mp4' },
  ]});
})();

function requireAuth(req,res,next){ if(!req.session.user){ return res.status(401).json({error:'auth'});} next(); }
function requireAdmin(req,res,next){ if(!req.session.user || req.session.user.role!=='admin'){ return res.status(403).json({error:'admin'});} next(); }

// ONE upload declaration
const upload = multer({ storage: multer.memoryStorage() });

app.post('/auth/signup', async (req,res)=>{
  const {email,password}=req.body; if(!email||!password) return res.status(400).json({});
  if(users.find(u=>u.email===email)) return res.status(409).json({error:'exists'});
  const passHash=await bcrypt.hash(password,10);
  const u={id:nanoid(),email,passHash,role:'user',profiles:[]}; users.push(u); req.session.user={id:u.id,email:u.email,role:u.role};
  res.json({ok:true});
});
app.post('/auth/login', async (req,res)=>{
  const {email,password}=req.body; const u=users.find(x=>x.email===email);
  if(!u || !(await bcrypt.compare(password,u.passHash))) return res.status(401).json({});
  req.session.user={id:u.id,email:u.email,role:u.role}; res.json({ok:true});
});
app.post('/auth/logout', (req,res)=>{ req.session.destroy(()=>res.json({ok:true})); });
app.get('/me', (req,res)=> res.json(req.session.user||null));

app.get('/profiles', requireAuth, (req,res)=>{
  const u=users.find(x=>x.id===req.session.user.id);
  res.json({items: u.profiles.map(p=>({id:p.id,name:p.name,avatarUrl:p.avatarUrl})) });
});
app.post('/profiles', requireAuth, (req,res)=>{
  const u=users.find(x=>x.id===req.session.user.id);
  if(u.profiles.length>=5) return res.status(400).json({error:'limit'});
  const p={id:nanoid(),name:(req.body.name||'Profile').slice(0,20),avatarUrl:req.body.avatarUrl||'/images/avatar1.png'}; u.profiles.push(p);
  res.json({id:p.id});
});
app.delete('/profiles/:id', requireAuth, (req,res)=>{
  const u=users.find(x=>x.id===req.session.user.id);
  u.profiles = u.profiles.filter(p=>p.id!==req.params.id);
  res.json({ok:true});
});

app.get('/genres',(req,res)=> res.json({items:genres}));

app.get('/titles', (req,res)=>{
  const {page='1', genre, sort='popularity', q} = req.query;
  let arr = titles.slice();
  if(q){ arr = arr.filter(t=> t.name.toLowerCase().includes(String(q).toLowerCase())); }
  if(genre){ arr = arr.filter(t=> (t.genres||[]).includes(genre)); }
  const limit=12; const p=parseInt(page); const items = arr.slice((p-1)*limit, p*limit);
  res.json({items: items.map(t=>({ id:t.id, name:t.name, type:t.type, year:t.year, posterUrl:t.posterUrl }))});
});

app.get('/titles/:id', (req,res)=>{
  const t = titles.find(x=>x.id===req.params.id); if(!t) return res.status(404).json({});
  res.json(t);
});
app.get('/titles/:id/similar',(req,res)=>{
  const t = titles.find(x=>x.id===req.params.id); if(!t) return res.json({items:[]});
  const items = titles.filter(x=> x.id!==t.id && (x.genres||[]).some(g=> (t.genres||[]).includes(g)))
    .map(x=>({id:x.id,name:x.name,posterUrl:x.posterUrl}));
  res.json({items});
});

app.post('/likes/toggle', requireAuth, (req,res)=>{
  res.json({ok:true}); // simplified for mock
});

app.get('/watch/source', requireAuth, (req,res)=>{
  const {titleId, episodeId} = req.query;
  const t=titles.find(x=>x.id===titleId);
  if(!t) return res.status(404).json({});
  const url = episodeId ? (t.episodes||[]).find(e=>e.id===episodeId)?.videoUrl : t.videoUrl;
  res.json({url});
});
app.post('/watch/progress', requireAuth, (req,res)=> res.json({ok:true}) );
app.post('/watch/finish', requireAuth, (req,res)=> res.json({ok:true}) );
app.get('/watch/next-episode', requireAuth, (req,res)=>{
  const {titleId,episodeId}=req.query;
  const t=titles.find(x=>x.id===titleId); if(!t||!t.episodes) return res.json({});
  if(!episodeId) return res.json({id:t.episodes[0].id});
  const idx = t.episodes.findIndex(e=>e.id===episodeId);
  const next = t.episodes[idx+1]; res.json(next||{});
});

app.get('/home/continue', requireAuth, (req,res)=> res.json({items: titles.slice(0,4).map(t=>({id:t.id,name:t.name,type:t.type,year:t.year,posterUrl:t.posterUrl}))}) );
app.get('/home/personal', requireAuth, (req,res)=> res.json({items: titles.slice(1,5).map(t=>({id:t.id,name:t.name,type:t.type,year:t.year,posterUrl:t.posterUrl}))}) );
app.get('/home/popular', (req,res)=> res.json({items: titles.slice(0,8).map(t=>({id:t.id,name:t.name,type:t.type,year:t.year,posterUrl:t.posterUrl}))}) );

app.get('/stats/views-by-day', requireAuth, (req,res)=> res.json({days:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], counts:[2,1,3,5,2,1,4]}) );
app.get('/stats/popular-by-genre', (req,res)=> res.json({labels:['Action','Drama','Kids'], values:[5,3,2]}) );

app.post('/admin/titles', requireAuth, requireAdmin, upload.fields([{name:'poster'},{name:'video'}]), (req,res)=>{
  const {type,name,year,genres:genStr,description} = req.body;
  const t={ id:nanoid(), type, name, year:Number(year), genres:(genStr||'').split(',').map(s=>s.trim()).filter(Boolean), description, posterUrl:'/images/mainscreen.jpeg' };
  if(type==='movie') t.videoUrl = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';
  else t.episodes=[{ id:nanoid(), season:1, episodeNumber:1, name:'Episode 1', videoUrl:'https://samplelib.com/lib/preview/mp4/sample-5s.mp4' }];
  titles.push(t);
  res.json({id:t.id});
});

app.get('*',(req,res)=>{
  const p = req.path;
  // Redirect old root-level pages to new locations
  if(p==='/signin-page.html') return res.redirect('/login.html');
  if(p==='/signup-page.html') return res.redirect('/signup.html');
  if(p==='/profile-selection.html') return res.redirect('/profile-selection.html');
  if(p==='/login.html'||p==='/signup.html'||p==='/profile-selection.html') return res.sendFile(path.join(__dirname,'../../public/views',p));
  if(!req.session.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname,'../../public/views','index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Mock app on http://localhost:'+PORT));
