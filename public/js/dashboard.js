/* Renders the Project Progress dashboard from /progress.json.
   Lifted out of index.html as an inline <script> on 2026-08-27 so that
   vercel.json's Content-Security-Policy can use a plain `script-src
   'self'` -- no 'unsafe-inline', no per-deploy hash to keep in sync.
   Behaviour is unchanged apart from the absolute path: the old inline
   copy fetched 'progress.json' relatively, and the file itself was
   sitting in the repo root rather than public/, so it 404'd on the
   deployed site and the headline never left "Loading...". */
fetch('/progress.json')
  .then(response => {
    if (!response.ok) throw new Error(`progress.json: HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    document.getElementById('project-headline').textContent = data.overall.headline;
    document.getElementById('project-status').textContent = data.status.state;

    const projectsList = document.getElementById('projects-list');
    data.projects.forEach(project => {
      const listItem = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = project.name;
      listItem.appendChild(name);
      /* textContent, not innerHTML: this is data fetched at runtime, and
         it renders in the site's own origin. */
      listItem.appendChild(document.createTextNode(` (${project.percent}%): ${project.summary}`));
      projectsList.appendChild(listItem);
    });
  })
  .catch(error => {
    console.error('Error loading progress.json:', error);
    const headline = document.getElementById('project-headline');
    if (headline) headline.textContent = 'Progress data unavailable';
  });
