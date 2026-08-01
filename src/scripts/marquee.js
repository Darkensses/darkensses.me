function Marquee(selector) {
  const parentSelector = document.querySelector('#marquee');
  const group1 = document.querySelector('#mg1');
  const group2 = document.querySelector('#mg2');

  const clone = group1.innerHTML;
  
  while(group1.scrollWidth < parentSelector.clientWidth) {
    group1.insertAdjacentHTML('beforeend', clone);    
  }
  
  group2.innerHTML = group1.innerHTML;

}

window.addEventListener('load', Marquee);
let t;
window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(Marquee, 120); })