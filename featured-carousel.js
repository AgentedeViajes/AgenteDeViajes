(() => {
  'use strict';

  function selectPublishedFeatured(programs) {
    return (programs||[]).filter(program=>
      program.source==='supabase'&&program.status==='published'&&program.featured===true
    );
  }

  function visibleCapacity(width) {
    return width<=680?1:width<=1024?2:4;
  }

  function pageCount(count,capacity) {
    return count>0&&capacity>0?Math.ceil(count/capacity):0;
  }

  function maxStart(count,capacity) {
    return Math.max(0,count-capacity);
  }

  function pageStart(page,count,capacity) {
    return Math.min(Math.max(0,page)*capacity,maxStart(count,capacity));
  }

  function activePage(index,count,capacity) {
    const pages=pageCount(count,capacity);
    if(!pages)return 0;
    const lastStart=maxStart(count,capacity);
    if(index>=lastStart)return pages-1;
    return Math.min(pages-1,Math.floor(Math.max(0,index)/capacity));
  }

  window.ModoRumboFeaturedCarousel={selectPublishedFeatured,visibleCapacity,pageCount,maxStart,pageStart,activePage};
})();
