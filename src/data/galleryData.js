const baseGalleryItems = [
  { title: 'Logo Reveal Moment 1', img: '/gallery/logoreveal1.jpeg', tags: ['logo', 'branding', 'event'] },
  { title: 'Logo Reveal Moment 2', img: '/gallery/logoreveal2.jpeg', tags: ['logo', 'branding', 'event'] },
  { title: 'Logo Reveal Moment 3', img: '/gallery/logoreveal3.png', tags: ['logo', 'branding', 'event'] },
  { title: 'MRS Visit 1', img: '/gallery/mrsvisit1.jpg', tags: ['visit', 'event', 'gallery'] },
  { title: 'MRS Visit 2', img: '/gallery/mrsvist2.png', tags: ['visit', 'event', 'gallery'] },
  { title: 'MRS Visit 3', img: '/gallery/mrsvisit3.png', tags: ['visit', 'event', 'gallery'] },
  { title: 'Lab Work Showcase', img: '/gallery/workdonebylab.jpeg', tags: ['achievement', 'lab', 'project'] },
  { title: 'Principal with 3D Printer', img: '/gallery/principalwith3dprinter.jpeg', tags: ['visit', '3d-printer', 'event'] },
  { title: 'Decoration Setup', img: '/gallery/harshamdecoration.jpeg', tags: ['event', 'decoration', 'team'] },
  { title: 'Safety Gear Preparation', img: '/gallery/safteygearup.jpeg', tags: ['safety', 'lab', 'team'] },
  { title: 'Lab Recognition Medal', img: '/gallery/medaldonebylab.jpeg', tags: ['achievement', 'award', 'lab'] },
  { title: 'Lab Activity in Progress', img: '/gallery/labworking1.jpeg', tags: ['lab', 'work', 'team'] },
  { title: 'Laser Cutter Demonstration', img: '/gallery/lasercutter.jpeg', tags: ['laser-cutter', 'equipment', 'lab'] },
  { title: '3D Printer in Action', img: '/gallery/3dprinter.jpeg', tags: ['3d-printer', 'equipment', 'lab'] },
  { title: 'Recognition by Oasis', img: '/gallery/recoginitionby%20oasis.jpeg', tags: ['recognition', 'achievement', 'event'] },
  { title: 'Hands-on Work Session', img: '/gallery/working1.jpeg', tags: ['workshop', 'lab', 'team'] },
  { title: 'Electronics Unit 2', img: '/gallery/electronic2.png', tags: ['electronics', 'equipment', 'lab'] },
  { title: 'Electronics Unit 1', img: '/gallery/electronic1.png', tags: ['electronics', 'equipment', 'lab'] },
  { title: 'Tool Set 2', img: '/gallery/tools2.png', tags: ['tools', 'equipment', 'lab'] },
  { title: 'Tool Set 1', img: '/gallery/tools1.png', tags: ['tools', 'equipment', 'lab'] },
  { title: 'Lab Orientation', img: '/gallery/laborentation.jpeg', tags: ['orientation', 'lab', 'event'] },
  { title: 'Inside the Lab Room', img: '/gallery/labroom.jpeg', tags: ['lab', 'infrastructure', 'space'] },
  { title: 'Leap 3D Printer Workshop', img: '/gallery/leap3dprinterworkshop1.jpeg', tags: ['workshop', '3d-printer', 'event'] },
  { title: 'Equipment Unloading', img: '/gallery/Unloading1.jpg', tags: ['setup', 'equipment', 'logistics'] },
  { title: 'Initial Lab Cleaning', img: '/gallery/inital%20cleaing%20lab1.jpeg', tags: ['cleaning', 'setup', 'lab'] },
  { title: 'Lab Setup Phase 1', img: '/gallery/labsetting1.jpeg', tags: ['setup', 'lab', 'infrastructure'] },
  { title: 'Lab Setup Phase 2', img: '/gallery/labsetting2.jpeg', tags: ['setup', 'lab', 'infrastructure'] },
  { title: 'Lab Installation Work', img: '/gallery/labinstalling1.jpeg', tags: ['installation', 'lab', 'infrastructure'] },
  { title: '2D Printer Installation', img: '/gallery/2dprinterinstalling2.jpg', tags: ['2d-printer', 'installation', 'setup'] },
  { title: '3D Printer Installation', img: '/gallery/3dprinter%20installing.jpeg', tags: ['3d-printer', 'installation', 'setup'] },
  { title: 'Laser Cutter Installation 1', img: '/gallery/lasercutterinstalling1.jpg', tags: ['laser-cutter', 'installation', 'setup'] },
  { title: 'Laser Cutter Installation 2', img: '/gallery/lasercutterinstalling2.png', tags: ['laser-cutter', 'installation', 'setup'] },
]

const uniqueItems = []
const seenImages = new Set()

baseGalleryItems.forEach((item) => {
  if (seenImages.has(item.img)) {
    return
  }
  seenImages.add(item.img)
  uniqueItems.push(item)
})

export const galleryItems = uniqueItems.map((item, index) => ({
  id: index + 1,
  ...item,
}))
