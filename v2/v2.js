document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('themeToggle').addEventListener('click', function () {
  var root = document.documentElement;
  var current = root.getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// Cards fade in gradually
var io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.18 });
document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

var workflowVideo = document.querySelector('.how-video');
if (workflowVideo && 'IntersectionObserver' in window &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var videoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        workflowVideo.play().catch(function (error) {
          console.error('Could not autoplay the workflow video:', error);
        });
      } else {
        workflowVideo.pause();
      }
    });
  }, { threshold: 0.25 });
  videoObserver.observe(workflowVideo);
}

// The road fills as you scroll through the path section
var road = document.getElementById('path-road');
var fill = document.getElementById('pathFill');
if (road && fill) {
  var stages = road.querySelectorAll('.milestone');

  function updatePath() {
    var rect = road.getBoundingClientRect();
    var anchor = window.innerHeight * 0.6;
    var p = (anchor - rect.top) / rect.height;
    fill.style.transform = 'scaleY(' + Math.min(1, Math.max(0, p)) + ')';
    stages.forEach(function (s) {
      s.classList.toggle('reached', s.getBoundingClientRect().top < anchor);
    });
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { updatePath(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updatePath();
}
