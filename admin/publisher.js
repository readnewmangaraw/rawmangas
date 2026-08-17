const OWNER = "readnewmangaraw";
const REPO = "rawmangas";
const BRANCH = "main";

const TOKEN_KEY = "rawmangas_admin_token";

const $ = id => document.getElementById(id);

let posts = [];
let editingPost = null;


/* =========================
   SESSION
========================= */

function getToken(){
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token){
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken(){
  sessionStorage.removeItem(TOKEN_KEY);
}


/* =========================
   LOGIN
========================= */

function showAdmin(){

  $("loginScreen").classList.add("hidden");
  $("adminScreen").classList.remove("hidden");

  loadPosts();
}

function showLogin(){

  $("adminScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");

  $("loginToken").value="";
}


if(getToken()){
  showAdmin();
}


$("loginBtn").onclick=async()=>{

  const token=$("loginToken").value.trim();

  if(!token){

    $("loginStatus").textContent=
      "Please enter your GitHub token.";

    return;
  }

  $("loginStatus").textContent="Checking token...";

  try{

    const response=await fetch(
      "https://api.github.com/user",
      {
        headers:{
          "Authorization":`Bearer ${token}`,
          "Accept":"application/vnd.github+json"
        }
      }
    );

    if(!response.ok){
      throw new Error("Invalid GitHub token.");
    }

    setToken(token);

    $("loginStatus").textContent="";

    showAdmin();

  }catch(error){

    $("loginStatus").textContent=
      error.message;

  }

};


$("logoutBtn").onclick=()=>{

  clearToken();

  editingPost=null;

  location.reload();

};


/* =========================
   GITHUB API
========================= */

async function githubRequest(path,options={}){

  const token=getToken();

  if(!token){
    throw new Error("You are logged out.");
  }

  const response=await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}${path}`,
    {
      ...options,
      headers:{
        "Authorization":`Bearer ${token}`,
        "Accept":"application/vnd.github+json",
        "Content-Type":"application/json",
        ...(options.headers||{})
      }
    }
  );

  const data=await response.json();

  if(!response.ok){

    throw new Error(
      data.message || "GitHub API error"
    );

  }

  return data;
}


/* =========================
   HELPERS
========================= */

function cleanSlug(value){

  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");

}


function toBase64(buffer){

  let binary="";

  const bytes=new Uint8Array(buffer);

  const chunk=0x8000;

  for(
    let i=0;
    i<bytes.length;
    i+=chunk
  ){

    binary+=String.fromCharCode(
      ...bytes.subarray(i,i+chunk)
    );

  }

  return btoa(binary);

}


function utf8Base64(text){

  return btoa(
    unescape(
      encodeURIComponent(text)
    )
  );

}


function base64Utf8(text){

  return decodeURIComponent(
    escape(
      atob(text)
    )
  );

}


/* =========================
   GET FILE
========================= */

async function getFile(path){

  try{

    return await githubRequest(
      `/contents/${path}?ref=${BRANCH}`
    );

  }catch(error){

    if(
      error.message.toLowerCase()
        .includes("not found")
    ){
      return null;
    }

    throw error;

  }

}


/* =========================
   WRITE FILE
========================= */

async function writeFile(
  path,
  content,
  message,
  sha=null
){

  const body={
    message,
    content,
    branch:BRANCH
  };

  if(sha){
    body.sha=sha;
  }

  return await githubRequest(
    `/contents/${path}`,
    {
      method:"PUT",
      body:JSON.stringify(body)
    }
  );

}


/* =========================
   DELETE FILE
========================= */

async function deleteFile(
  path,
  sha,
  message
){

  return await githubRequest(
    `/contents/${path}`,
    {
      method:"DELETE",
      body:JSON.stringify({
        message,
        sha,
        branch:BRANCH
      })
    }
  );

}


/* =========================
   POSTS JSON
========================= */

async function getPostsFile(){

  const file=await getFile(
    "data/posts.json"
  );

  if(!file){

    return {
      sha:null,
      posts:[]
    };

  }

  let data=[];

  try{

    data=JSON.parse(
      base64Utf8(
        file.content.replace(/\n/g,"")
      )
    );

  }catch{

    data=[];

  }

  if(!Array.isArray(data)){
    data=[];
  }

  return {
    sha:file.sha,
    posts:data
  };

}


async function savePosts(){

  const file=await getFile(
    "data/posts.json"
  );

  const content=
    JSON.stringify(
      posts,
      null,
      2
    );

  await writeFile(
    "data/posts.json",
    utf8Base64(content),
    "Update posts data",
    file ? file.sha : null
  );

}


/* =========================
   LOAD POSTS
========================= */

async function loadPosts(){

  $("postsList").textContent=
    "Loading posts...";

  try{

    const result=
      await getPostsFile();

    posts=result.posts;

    renderPosts();

  }catch(error){

    $("postsList").textContent=
      "Error: "+error.message;

  }

}


/* =========================
   RENDER POSTS
========================= */

function renderPosts(){

  if(!posts.length){

    $("postsList").innerHTML=
      "<p>No posts found.</p>";

    return;

  }

  $("postsList").innerHTML=
    posts.map(
      (post,index)=>`

      <div class="post-item">

        <div class="post-info">

          <strong>
            ${escapeHTML(post.title || "Untitled")}
          </strong>

          <small>
            Chapter ${escapeHTML(
              post.chapter || ""
            )}
            ·
            ${escapeHTML(
              post.slug || ""
            )}
          </small>

        </div>

        <div class="post-actions">

          <button
            class="edit-btn"
            onclick="editPost(${index})"
          >
            Edit
          </button>

          <button
            class="delete-btn"
            onclick="deletePost(${index})"
          >
            Delete
          </button>

        </div>

      </div>

    `
    ).join("");

}


function escapeHTML(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


/* =========================
   EDIT POST
========================= */

window.editPost=function(index){

  const post=posts[index];

  if(!post){
    return;
  }

  editingPost=post;

  $("editingPath").value=
    post.path || "";

  $("postTitle").value=
    post.title || "";

  $("chapterNumber").value=
    post.chapter || "";

  $("slug").value=
    post.slug || "";

  $("formTitle").textContent=
    "Edit Post";

  $("publishBtn").textContent=
    "Update Post";

  renderExistingFiles(post);

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

};


function renderExistingFiles(post){

  $("currentCover").innerHTML="";

  $("existingPages").innerHTML="";

  if(post.cover){

    $("currentCover").innerHTML=`

      <div class="file-item">

        <span>
          Current cover:
          ${escapeHTML(post.cover)}
        </span>

      </div>

    `;

  }

  if(
    Array.isArray(post.images)
  ){

    $("existingPages").innerHTML=
      post.images.map(
        image=>`

        <div class="file-item">

          <span>
            ${escapeHTML(image)}
          </span>

        </div>

      `
      ).join("");

  }

}


/* =========================
   NEW POST
========================= */

$("newPostBtn").onclick=()=>{

  editingPost=null;

  $("editingPath").value="";

  $("postTitle").value="";

  $("chapterNumber").value="";

  $("slug").value="";

  $("cover").value="";

  $("pages").value="";

  $("currentCover").innerHTML="";

  $("existingPages").innerHTML="";

  $("formTitle").textContent=
    "Create New Post";

  $("publishBtn").textContent=
    "Publish New Post";

};


/* =========================
   PUBLISH / UPDATE
========================= */

$("publishBtn").onclick=async()=>{

  const title=
    $("postTitle").value.trim();

  const chapter=
    $("chapterNumber").value.trim();

  const slug=
    cleanSlug(
      $("slug").value
    );

  const cover=
    $("cover").files[0];

  const pages=[
    ...$("pages").files
  ];


  if(
    !title ||
    !chapter ||
    !slug
  ){

    $("publishStatus").textContent=
      "Please enter title, chapter number and slug.";

    return;

  }


  if(
    !editingPost &&
    (!cover || !pages.length)
  ){

    $("publishStatus").textContent=
      "Please select the title image and chapter images.";

    return;

  }


  $("publishBtn").disabled=true;

  $("publishStatus").textContent=
    editingPost
      ? "Updating post..."
      : "Publishing post...";


  try{

    let imageList=
      editingPost &&
      Array.isArray(editingPost.images)
        ? [...editingPost.images]
        : [];


    let coverPath=
      editingPost
        ? editingPost.cover
        : null;


    /* COVER */

    if(cover){

      const ext=
        cover.name
          .split(".")
          .pop()
          .toLowerCase();

      coverPath=
        `images/${slug}/title.${ext}`;

      const existing=
        await getFile(coverPath);

      const buffer=
        await cover.arrayBuffer();

      await writeFile(
        coverPath,
        toBase64(buffer),
        `Update ${slug} cover`,
        existing ? existing.sha : null
      );

    }


    /* NEW CHAPTER IMAGES */

    for(
      let i=0;
      i<pages.length;
      i++
    ){

      const file=pages[i];

      const ext=
        file.name
          .split(".")
          .pop()
          .toLowerCase();

      const number=
        String(
          imageList.length + i + 1
        ).padStart(3,"0");

      const path=
        `images/${slug}/${number}.${ext}`;

      const buffer=
        await file.arrayBuffer();

      await writeFile(
        path,
        toBase64(buffer),
        `Add ${slug} page ${number}`
      );

      imageList.push(path);

    }


    /* HTML */

    const coverExt=
      coverPath
        ? coverPath.split(".").pop()
        : "jpg";


    const imageHTML=
      imageList.map(
        path=>`

        <img
          src="../../${path}"
          alt="${escapeHTML(
            title
          )} 第${escapeHTML(
            chapter
          )}話"
          loading="lazy"
        >

      `
      ).join("");


    const html=buildChapterHTML({
      title,
      chapter,
      slug,
      coverPath,
      coverExt,
      imageHTML
    });


    const htmlPath=
      `posts/${slug}/index.html`;


    const oldHTML=
      await getFile(htmlPath);


    await writeFile(
      htmlPath,
      utf8Base64(html),
      editingPost
        ? `Update ${title} Chapter ${chapter}`
        : `Publish ${title} Chapter ${chapter}`,
      oldHTML ? oldHTML.sha : null
    );


    /* POSTS DATA */

    const postData={
      title,
      chapter,
      slug,
      path:htmlPath,
      cover:coverPath,
      images:imageList,
      updatedAt:new Date().toISOString()
    };


    if(editingPost){

      const index=
        posts.findIndex(
          p=>p.path===editingPost.path
        );

      if(index!==-1){

        posts[index]=postData;

      }

    }else{

      posts.unshift(postData);

    }


    await savePosts();


    $("publishStatus").textContent=
      editingPost
        ? "Post updated successfully."
        : "Post published successfully.";


    editingPost=null;

    $("formTitle").textContent=
      "Create New Post";

    $("publishBtn").textContent=
      "Publish New Post";


    await loadPosts();


  }catch(error){

    $("publishStatus").textContent=
      "Error:\n"+error.message;

  }finally{

    $("publishBtn").disabled=false;

  }

};


/* =========================
   CHAPTER HTML
========================= */

function buildChapterHTML({
  title,
  chapter,
  slug,
  coverPath,
  coverExt,
  imageHTML
}){

return `<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1"
>

<title>
${escapeHTML(title)}
 第${escapeHTML(chapter)}話 Raw | RawMangas
</title>

<meta
name="description"
content="${escapeHTML(title)}
 第${escapeHTML(chapter)}話をRawMangasで読むことができます。"
>

<meta
name="robots"
content="index, follow"
>

<link
rel="canonical"
href="https://readnewmangaraw.github.io/rawmangas/posts/${encodeURIComponent(slug)}/"
>

<link
rel="stylesheet"
href="../../style.css"
>

</head>


<body>


<header class="site-header">

<div class="container">

<a
class="logo"
href="../../"
>
Raw<span>Mangas</span>
</a>

<nav>

<a href="../../">
ホーム
</a>

</nav>

</div>

</header>


<main class="chapter-page">

<div class="container">

<article class="chapter">


<header class="chapter-header">

<div class="breadcrumb">

<a href="../../">
ホーム
</a>

<span>›</span>

<span>
${escapeHTML(title)}
</span>

</div>


<h1>
${escapeHTML(title)}
 第${escapeHTML(chapter)}話
</h1>


<p class="chapter-meta">
${escapeHTML(title)}
 Raw · 第${escapeHTML(chapter)}話
</p>

</header>


<div class="title-image">

<img
src="../../${coverPath}"
alt="${escapeHTML(title)}
 第${escapeHTML(chapter)}話"
>

</div>


<div class="chapter-content">

${imageHTML}

</div>


<nav class="chapter-navigation">

<a
href="../../"
class="chapter-button"
>
前の話
</a>

<a
href="../../"
class="chapter-button home-button"
>
ホーム
</a>

<a
href="../../"
class="chapter-button"
>
次の話
</a>

</nav>


</article>

</div>

</main>


<footer>

<div class="container">

<p>
© 2026 RawMangas.
</p>

</div>

</footer>


</body>

</html>`;

}


/* =========================
   DELETE POST
========================= */

window.deletePost=async function(index){

  const post=posts[index];

  if(!post){
    return;
  }


  const confirmed=
    confirm(
      `Delete "${post.title}" Chapter ${post.chapter}?\n\nThis will delete the chapter page and its images.`
    );


  if(!confirmed){
    return;
  }


  $("postsList").textContent=
    "Deleting post...";


  try{


    /* DELETE HTML */

    const htmlFile=
      await getFile(
        post.path
      );


    if(htmlFile){

      await deleteFile(
        post.path,
        htmlFile.sha,
        `Delete ${post.slug} page`
      );

    }


    /* DELETE IMAGES */

    const files=
      Array.isArray(post.images)
        ? [...post.images]
        : [];


    if(post.cover){
      files.unshift(post.cover);
    }


    for(const path of files){

      const file=
        await getFile(path);

      if(file){

        await deleteFile(
          path,
          file.sha,
          `Delete ${post.slug} image`
        );

      }

    }


    posts.splice(index,1);

    await savePosts();

    await loadPosts();


    $("publishStatus").textContent=
      "Post deleted successfully.";


  }catch(error){

    $("publishStatus").textContent=
      "Delete error:\n"+error.message;

    await loadPosts();

  }

};


/* =========================
   REFRESH
========================= */

$("refreshBtn").onclick=
  loadPosts;

