document.addEventListener("DOMContentLoaded", () => {

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
    const slug = String(post.slug || "");
    const cover = String(post.cover || "");

    return `
      <article class="manga-card">

        <a href="./posts/${encodeURIComponent(slug)}/">

          <img
            src="./${cover}"
            alt="${title}"
            loading="lazy"
          >

          <div class="card-content">

            <h3>${title}</h3>

            <p>${chapter}</p>

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
        "./data/posts.json?v=" + Date.now(),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          "posts.json HTTP " + response.status
        );
      }

      const posts = await response.json();

      if (!Array.isArray(posts)) {
        throw new Error("posts.json is not an array");
      }

      posts.sort((a, b) => {
        return new Date(b.updatedAt || 0)
          - new Date(a.updatedAt || 0);
      });

      renderGrid(
        latestGrid,
        posts.slice(0, 12)
      );

      renderGrid(
        popularGrid,
        posts.slice(0, 12)
      );

      renderGrid(
        allGrid,
        posts.slice(0, 24)
      );

      console.log(
        "RawMangas: loaded",
        posts.length,
        "posts"
      );

    } catch (error) {

      console.error(
        "RawMangas posts error:",
        error
      );

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

});
