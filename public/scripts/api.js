const api={
  async get(url){ return fetch(url,{credentials:'include'}); },
  async post(url,body){ return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'include'}); },
  async put(url,body){ return fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'include'}); },
  async delete(url){ return fetch(url,{method:'DELETE',credentials:'include'}); },
};
