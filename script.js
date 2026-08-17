const latestGrid = document.getElementById("latest-grid");
const popularGrid = document.getElementById("popular-grid");
const allGrid = document.getElementById("all-grid");

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createPostCard(post) {

  const title = escapeHTML(post.title);
  const chapter = escapeHTML(post.chapter);
  const slug = encodeURIComponent(post.slug);
  const cover = encodeURI(post.cover);

  return `
    <article class="manga-card">

      <a href="./posts/${slug}/">

        <img
          src="./${cover}"
          alt="${title}"
          loading="lazy"
        >

        <div class="card-content">

          <h3>${title}</h3>

          <p>第${chapter}話</p>

        </div>

      </a>

    </article>
  `;
}

function renderGrid(grid, posts) {

  if (!grid) return;

  if (!posts.length) {

    grid.innerHTML = `
      <p class="empty-posts">
        現在、公開されているマンガはありません。
      </p>
    `;

    return;
  }

  grid.innerHTML = posts
    .map(createPostCard)
    .join("");
}

async function loadPosts() {

  try {

    const response = await fetch(
      "./data/posts.json?v=" + Date.now()
    );

    if (!response.ok) {
      throw new Error("posts.json could not be loaded");
    }

    const posts = await response.json();

    if (!Array.isArray(posts)) {
      throw new Error("Invalid posts.json format");
    }

    const sortedPosts = [...posts].sort(
      (a, b) =>
        new Date(b.updatedAt || 0) -
        new Date(a.updatedAt || 0)
    );

    /* 最新話 */
    renderGrid(
      latestGrid,
      sortedPosts.slice(0, 12)
    );

    /* 人気作品 */
    renderGrid(
      popularGrid,
      sortedPosts.slice(0, 12)
    );

    /* 最新マンガ */
    renderGrid(
      allGrid,
      sortedPosts.slice(0, 24)
    );

  } catch (error) {

    console.error(error);

    const message = `
      <p class="empty-posts">
        マンガを読み込めませんでした。
      </p>
    `;

    if (latestGrid) latestGrid.innerHTML = message;
    if (popularGrid) popularGrid.innerHTML = message;
    if (allGrid) allGrid.innerHTML = message;

  }

}

loadPosts();
