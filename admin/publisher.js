const OWNER = "readnewmangaraw";
const REPO = "rawmangas";
const BRANCH = "main";

const $ = id => document.getElementById(id);

function cleanSlug(value){
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function base64(buffer){
  let binary="";
  const bytes=new Uint8Array(buffer);
  const chunk=0x8000;

  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  }

  return btoa(binary);
}

async function githubPut(token,path,content,message){

  const url=
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  const response=await fetch(url,{
    method:"PUT",
    headers:{
      "Authorization":`Bearer ${token}`,
      "Accept":"application/vnd.github+json",
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      message,
      content,
      branch:BRANCH
    })
  });

  const data=await response.json();

  if(!response.ok){
    throw new Error(data.message || "GitHub API error");
  }

  return data;
}

$("publish").onclick=async()=>{

  const token=$("token").value.trim();
  const title=$("title").value.trim();
  const chapter=$("chapter").value.trim();
  const slug=cleanSlug($("slug").value);

  const cover=$("cover").files[0];
  const pages=[...$("pages").files];

  if(!token||!title||!chapter||!slug||!cover||!pages.length){
    $("status").textContent="すべての項目を入力してください。";
    return;
  }

  $("publish").disabled=true;
  $("status").textContent="公開中...";

  try{

    const images=[];

    const all=[
      {file:cover,name:"title"},
      ...pages.map((file,i)=>({
        file,
        name:String(i+1).padStart(3,"0")
      }))
    ];

    for(const item of all){

      const buffer=await item.file.arrayBuffer();

      const ext=
        item.file.name.split(".").pop().toLowerCase() || "jpg";

      const path=
        `images/${slug}/${item.name}.${ext}`;

      await githubPut(
        token,
        path,
        base64(buffer),
        `Add ${slug} image ${item.name}`
      );

      images.push({
        path,
        name:item.name
      });
    }

    const imageHTML=images
      .filter(x=>x.name!=="title")
      .map(x=>`
        <img
          src="../../${x.path}"
          alt="${title} 第${chapter}話"
          loading="lazy"
        >
      `)
      .join("");

    const html=`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>${title} 第${chapter}話 Raw | RawMangas</title>

<meta name="description"
content="${title} 第${chapter}話をRawMangasで読むことができます。">

<meta name="robots" content="index, follow">

<link rel="canonical"
href="https://readnewmangaraw.github.io/rawmangas/posts/${slug}/">

<link rel="stylesheet" href="../../style.css">
</head>

<body>

<header class="site-header">
<div class="container">

<a class="logo" href="../../">
Raw<span>Mangas</span>
</a>

<nav>
<a href="../../">ホーム</a>
</nav>

</div>
</header>

<main class="chapter-page">

<div class="container">

<article class="chapter">

<header class="chapter-header">

<div class="breadcrumb">
<a href="../../">ホーム</a>
<span>›</span>
<span>${title}</span>
</div>

<h1>${title} 第${chapter}話</h1>

<p class="chapter-meta">
${title} Raw · 第${chapter}話
</p>

</header>

<div class="title-image">

<img
src="../../images/${slug}/title.${cover.name.split(".").pop()}"
alt="${title} 第${chapter}話"
>

</div>

<div class="chapter-content">

${imageHTML}

</div>

<nav class="chapter-navigation">

<a href="../../" class="chapter-button">
ホーム
</a>

<a href="../../" class="chapter-button home-button">
ホーム
</a>

<a href="../../" class="chapter-button">
次の話
</a>

</nav>

</article>

</div>

</main>

<footer>
<div class="container">
<p>© 2026 RawMangas.</p>
</div>
</footer>

</body>
</html>`;

    await githubPut(
      token,
      `posts/${slug}/index.html`,
      btoa(unescape(encodeURIComponent(html))),
      `Publish ${title} Chapter ${chapter}`
    );

    $("status").textContent=
      `公開完了！\n\n/posts/${slug}/`;

  }catch(error){

    $("status").textContent=
      "エラー:\n"+error.message;

  }finally{

    $("publish").disabled=false;

  }
};
