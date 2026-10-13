/* TYRAVORN — deterministic procedural field archive.
   Portraits are layered Canvas illustrations, not photorealistic 3D models. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const list = $("#creatureList"), sentinel = $("#sentinel"), notice = $("#searchNotice");
  const searchForm = $("#searchForm"), searchInput = $("#profileSearch");
  const currentNumber = $("#currentNumber");
  const VERSION = "tyravorn-render-v2";
  const MAX_CARDS = 120;
  const INITIAL_PROFILES = 100;
  const GENERATE_BATCH = 20;
  const PREFETCH_DISTANCE = 1500;
  const CARD_STEP = 1; // profile IDs are direct identities, never array indexes.
  let nextId = "1", streamPaused = false, activeDirect = false;
  const cache = new Map();
  const CACHE_LIMIT = 18;
  const profiles = new Map();

  const blueprints = [
    {type:"Dominant terrestrial hunter", group:"large predator", head:"deep", body:"powerful", habitat:["Conifer forest edge","Fern-covered floodplain","Rocky woodland"], epoch:[0,1,2]},
    {type:"Swift small hunter", group:"small predator", head:"narrow", body:"lean", habitat:["Fern thicket","Open woodland","Riverbank undergrowth"], epoch:[0,1,2]},
    {type:"Long-necked browser", group:"long-necked herbivore", head:"small", body:"colossal", habitat:["Ancient woodland","Broad floodplain","Lake-margin forest"], epoch:[0,1,2]},
    {type:"Heavy-bodied browser", group:"heavy herbivore", head:"broad", body:"barrel", habitat:["Cycad grove","Open fern plain","Woodland clearing"], epoch:[0,1,2]},
    {type:"Armored low browser", group:"armored herbivore", head:"compact", body:"armored", habitat:["Dry woodland","Fern-rich understory","Rocky scrub"], epoch:[0,1,2]},
    {type:"Plated herbivore", group:"plated herbivore", head:"small", body:"plated", habitat:["Conifer woodland","River valley","Open woodland"], epoch:[1,2]},
    {type:"Feathered agile animal", group:"feathered animal", head:"beaked", body:"feathered", habitat:["Dense understory","Forest margin","Cycad thicket"], epoch:[1,2]},
    {type:"Early bird-like animal", group:"early bird-like animal", head:"beaked", body:"avian", habitat:["Canopy edge","Lake shore","Open woodland"], epoch:[1,2]},
    {type:"Flying reptile", group:"flying reptile", head:"long beak", body:"winged", habitat:["Coastal cliff","River corridor","Shallow-sea coast"], epoch:[0,1,2]},
    {type:"Marine reptile", group:"marine reptile", head:"aquatic", body:"aquatic", habitat:["Shallow inland sea","Rocky coastline","Open coastal water"], epoch:[0,1,2]},
    {type:"Ancient crocodile relative", group:"crocodile-line reptile", head:"long snout", body:"low-slung", habitat:["Muddy riverbank","Swamp margin","Shallow lagoon"], epoch:[0,1,2]},
    {type:"Small early mammal", group:"early mammal", head:"mammalian", body:"small mammal", habitat:["Leaf litter","Root hollow","Forest floor"], epoch:[0,1,2]},
    {type:"Prehistoric amphibian", group:"amphibian", head:"wide", body:"amphibious", habitat:["Freshwater marsh","Shaded pond","Wet floodplain"], epoch:[0,1,2]},
    {type:"Ancient fish", group:"ancient fish", head:"fish", body:"fish", habitat:["Shallow sea","Freshwater channel","Reef-like shoal"], epoch:[0,1,2]},
    {type:"Large invertebrate", group:"giant invertebrate", head:"segmented", body:"invertebrate", habitat:["Damp forest floor","Shoreline pools","Fern litter"], epoch:[0,1,2]}
  ];
  const epochs = [
    {name:"Early Jurassic",date:"201.4–174.7 Ma"},
    {name:"Middle Jurassic",date:"174.7–161.5 Ma"},
    {name:"Late Jurassic",date:"161.5–145 Ma"}
  ];
  const palettes = [
    ["#394d35","#8a9861","#c0b17c"],["#4e3930","#a26e4b","#d0ad7c"],
    ["#283f43","#64877a","#b7c8a1"],["#494a3d","#8d8762","#d2c7a0"],
    ["#302e3a","#756b83","#c0a7a0"],["#493a25","#b18c4d","#e2c88a"],
    ["#26352a","#687b4c","#a9b67c"],["#34404b","#788c9a","#d1c6a0"],
    ["#3e302a","#795446","#b88968"],["#263b3b","#4d7772","#b0c8b5"]
  ];
  const habitats = ["misty conifer woodland","fern-rich floodplain","rocky coastal shelf","shallow Jurassic sea","humid river valley","sunlit cycads and ginkgo relatives","marshland beneath ancient trees","open woodland after rainfall"];
  const nameA = ["Var","Khar","Dra","Zor","Vel","Oryn","Skel","Thar","Rav","Mor","Keth","Ulv","Bran","Yor","Vesk","Azh","Kor","Nyr","Drav","Syl"];
  const nameB = ["ak","or","eth","av","un","yra","ath","ev","os","ir","an","oth","el","uva","ark","esh","ion","ara","yr","om"];
  const nameC = ["vorn","thar","drax","yron","vex","khal","rune","zeth","mora","drin","val","kesh","oryx","thane","zora","vyr","dune","rath","myr","kron"];
  const choose = (a,r) => a[Math.floor(r()*a.length)];
  function hashString(s) { // arbitrary-length decimal string; no Number conversion
    let h1=0x811c9dc5, h2=0x9e3779b9;
    for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,0x01000193);h2=Math.imul(h2^(c+i),0x85ebca6b);h2=(h2<<13)|(h2>>>19);}
    return (h1^h2)>>>0;
  }
  function rng(seed){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function makeName(r) {
    let a=choose(nameA,r), b=choose(nameB,r), c=choose(nameC,r);
    if(a.slice(-1).toLowerCase()===b[0].toLowerCase()) b=b.slice(1);
    if(b.slice(-1).toLowerCase()===c[0].toLowerCase()) c=c.slice(1);
    return a+b+c;
  }
  function createProfile(id) {
    if(profiles.has(id)) return profiles.get(id);
    const seed=hashString(VERSION+"|"+id), r=rng(seed);
    const bp=blueprints[Math.floor(r()*blueprints.length)];
    const epochIndex=bp.epoch[Math.floor(r()*bp.epoch.length)];
    const palette=palettes[Math.floor(r()*palettes.length)];
    const p={
      id, seed, rSeed:seed, name:makeName(r), blueprint:bp, epoch:epochs[epochIndex],
      habitat:choose(bp.habitat,r), palette, size:makeSize(bp.group,r),
      traits:makeTraits(bp,r), behavior:makeBehavior(bp.group,r),
      variant:Math.floor(r()*1000000), pose:Math.floor(r()*4),
      headScale:.82+r()*.42, neckScale:.8+r()*.5, texture:Math.floor(r()*4),
      crest:r(), feathers:r(), markings:r(), eyeHue:choose(["amber","#b7c88d","#8ab5b0","#c7a16b"],r),
      lighting:Math.floor(r()*3), env:Math.floor(r()*habitats.length), yaw:r()
    };
    profiles.set(id,p);
    return p;
  }
  function makeSize(group,r) {
    const ranges={
      "large predator":[7,12],"small predator":[.7,3],"long-necked herbivore":[12,25],
      "heavy herbivore":[4,10],"armored herbivore":[3,7],"plated herbivore":[4,9],
      "feathered animal":[.3,1.8],"early bird-like animal":[.2,.8],"flying reptile":[.5,5],
      "marine reptile":[1.5,9],"crocodile-line reptile":[1,6],"early mammal":[.08,.7],
      "amphibian":[.3,2.5],"ancient fish":[.2,4],"giant invertebrate":[.05,1.2]
    };
    const [a,b]=ranges[group]||[1,4], n=a+r()*(b-a);
    return n<1?`${Math.round(n*100)}–${Math.round(n*130)} cm`:`${n.toFixed(1)}–${(n*1.18).toFixed(1)} m`;
  }
  function makeTraits(bp,r) {
    const traitSets={
      "large predator":["Deep skull with reinforced jaw muscles","Heavy tail balances a forward-set torso","Raised facial ridges shade the eyes"],
      "small predator":["Long balancing tail and spring-loaded legs","Fine feathering along the forelimbs","Narrow snout tuned for quick strikes"],
      "long-necked herbivore":["Tall shoulder line and column-like limbs","Small head at the end of a flexible neck","Broad gut-bearing torso"],
      "heavy herbivore":["Deep barrel-shaped torso","Broad muzzle for cropping tough plants","Powerful forequarters and sturdy limbs"],
      "armored herbivore":["Overlapping dermal armor across the back","Low centre of gravity and compact skull","Protective scutes along the flanks"],
      "plated herbivore":["Raised dorsal plates with vascular-looking ridges","Long muscular tail","Small head and broad plant-processing muzzle"],
      "feathered animal":["Layered contour feathers along the arms","Long counterbalancing tail fan","Fine facial filaments"],
      "early bird-like animal":["Feathered forelimbs and compact torso","Light skull and grasping feet","Asymmetric-looking feather arrangement"],
      "flying reptile":["Elongated wing-supporting forelimbs","Lightweight torso and narrow chest","Membranous wings with visible supporting rays"],
      "marine reptile":["Streamlined body with paddle-like limbs","Flexible tail suited to aquatic propulsion","Small surface ridges shed water"],
      "crocodile-line reptile":["Long low snout with close-set teeth","Armoured back and laterally flattened tail","Eyes and nostrils sit high on the skull"],
      "early mammal":["Sensitive whisker-like facial hairs","Compact limbs and warm insulating fur","Small jaw with differentiated teeth"],
      "amphibian":["Broad flattened head","Moist, finely pebbled skin","Short limbs suited to wet ground"],
      "ancient fish":["Overlapping scales and protective fin rays","Lateral-line sensory pores","Tail fin built for steady propulsion"],
      "giant invertebrate":["Segmented protective plates","Jointed appendages and sensory feelers","Hard outer surface with fine etched grooves"]
    };
    return choose(traitSets[bp.group]||traitSets["large predator"],r);
  }
  function makeBehavior(group,r) {
    const options={
      "large predator":["A patient ambush hunter of shaded forest corridors.","Tracks large herbivores along seasonal river routes."],
      "small predator":["Moves in short bursts through dense fern cover.","Uses quick turns to pursue small woodland prey."],
      "long-necked herbivore":["Browses high foliage and travels between feeding grounds.","Moves in loose groups across broad floodplains."],
      "heavy herbivore":["Feeds steadily through cycads and low-growing vegetation.","Uses bulk and a broad stance to deter threats."],
      "armored herbivore":["Keeps close to cover and turns its armored flank toward danger.","Forages slowly, relying on protection rather than speed."],
      "plated herbivore":["Raises its silhouette when startled and keeps its tail clear.","Follows well-watered woodland paths."],
      "feathered animal":["Forages among leaf litter, alert to every movement.","Uses feathered forelimbs for balance and display."],
      "early bird-like animal":["Flits between low branches and shoreline cover.","Searches for small invertebrates in damp leaf litter."],
      "flying reptile":["Launches from exposed rocks into coastal air currents.","Rests on ledges above water and open ground."],
      "marine reptile":["Patrols near-shore waters where currents concentrate prey.","Surfaces briefly in sheltered coastal bays."],
      "crocodile-line reptile":["Waits almost motionless at the edge of shallow water.","Moves between muddy banks and sheltered lagoons."],
      "early mammal":["Emerges at dusk to forage beneath roots and fallen wood.","Shelters in protected hollows during daylight."],
      "amphibian":["Remains near freshwater where its skin stays moist.","Waits among submerged roots for small prey."],
      "ancient fish":["Keeps to calmer water near submerged vegetation.","Uses quick tail bursts to escape larger aquatic hunters."],
      "giant invertebrate":["Moves through damp litter and sheltered shoreline pockets.","Uses sensitive feelers to navigate dark, humid cover."]
    };
    return choose(options[group]||options["large predator"],r);
  }

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function drawPortrait(canvas,p,high=false) {
    const dpr=Math.min(window.devicePixelRatio||1, high?2:1.35);
    const rect=canvas.getBoundingClientRect();
    const w=Math.max(280,Math.floor((rect.width||480)*dpr)), h=Math.max(240,Math.floor((rect.height||330)*dpr));
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{alpha:false}); if(!ctx)return;
    const sx=w/480, sy=h/330; ctx.setTransform(sx,0,0,sy,0,0);
    const r=rng(p.seed), [base,mid,light]=p.palette;
    const grad=ctx.createLinearGradient(0,0,0,330);
    grad.addColorStop(0,["#23352b","#283d42","#3c3428","#26392d"][p.env%4]);
    grad.addColorStop(.62,"#17231a");grad.addColorStop(1,"#0b110d");ctx.fillStyle=grad;ctx.fillRect(0,0,480,330);
    // Atmospheric sun and distant landscape
    const sun=ctx.createRadialGradient(320,75,2,320,75,125);sun.addColorStop(0,"rgba(208,190,126,.27)");sun.addColorStop(1,"rgba(208,190,126,0)");ctx.fillStyle=sun;ctx.fillRect(180,0,280,210);
    ctx.fillStyle="#27372b";ctx.beginPath();ctx.moveTo(0,195);for(let x=0;x<=480;x+=40)ctx.lineTo(x,140+r()*55);ctx.lineTo(480,330);ctx.lineTo(0,330);ctx.closePath();ctx.fill();
    // Tree trunks and foliage silhouettes
    for(let i=0;i<13;i++){let x=r()*500,y=65+r()*90,hh=50+r()*105;ctx.fillStyle=i%2?"#17251a":"#1d2c1e";ctx.fillRect(x,y,3+r()*7,hh);ctx.beginPath();ctx.ellipse(x+3,y,18+r()*20,23+r()*30,0,0,Math.PI*2);ctx.fill();}
    // fog bands
    for(let i=0;i<4;i++){ctx.fillStyle=`rgba(177,191,154,${.018+r()*.025})`;ctx.beginPath();ctx.ellipse(r()*480,160+r()*120,80+r()*100,8+r()*18,0,0,Math.PI*2);ctx.fill();}
    const g=p.blueprint.group;
    ctx.save();ctx.translate(0,4);
    // soft cast shadow
    ctx.fillStyle="rgba(0,0,0,.42)";ctx.beginPath();ctx.ellipse(270,291,170,18,0,0,Math.PI*2);ctx.fill();
    // rear features vary by body family
    if(g==="flying reptile"){
      ctx.fillStyle=shade(base,-20);ctx.beginPath();ctx.moveTo(220,180);ctx.quadraticCurveTo(160,65,70,42);ctx.quadraticCurveTo(112,150,198,224);ctx.closePath();ctx.fill();
      ctx.strokeStyle=shade(light,-15);ctx.lineWidth=1;for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(198,210);ctx.quadraticCurveTo(130+i*4,130-i*7,80+i*5,54+i*5);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(275,178);ctx.quadraticCurveTo(330,65,421,45);ctx.quadraticCurveTo(390,160,300,224);ctx.closePath();ctx.fill();
    } else if(g==="marine reptile"||g==="ancient fish"){
      ctx.fillStyle=shade(base,-12);ctx.beginPath();ctx.moveTo(235,185);ctx.quadraticCurveTo(325,175,388,208);ctx.lineTo(445,175);ctx.lineTo(427,220);ctx.lineTo(453,247);ctx.quadraticCurveTo(345,250,255,240);ctx.closePath();ctx.fill();
      if(g==="ancient fish"){for(let i=0;i<7;i++){ctx.strokeStyle=shade(light,-20);ctx.beginPath();ctx.moveTo(278+i*13,190);ctx.lineTo(282+i*13,235);ctx.stroke();}}
      else {for(let i=0;i<3;i++){ctx.fillStyle=shade(base,12);ctx.beginPath();ctx.ellipse(300+i*24,230+i%2*9,17,8,.25,0,Math.PI*2);ctx.fill();}}
    } else if(g==="giant invertebrate"){
      for(let i=0;i<9;i++){ctx.fillStyle=i%2?shade(base,-8):base;ctx.beginPath();ctx.ellipse(250+i*17,222-i*3,18,25-i*.8,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle=shade(light,-15);ctx.stroke();}
      for(let i=0;i<7;i++){ctx.strokeStyle=base;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(260+i*12,233);ctx.quadraticCurveTo(245+i*16,260+r()*10,230+i*23,270);ctx.stroke();}
    } else {
      // body and shoulder mass, with family-specific proportions
      ctx.fillStyle=base;ctx.beginPath();
      if(g==="long-necked herbivore"){ctx.ellipse(265,224,132,62,-.05,0,Math.PI*2);ctx.moveTo(202,230);ctx.quadraticCurveTo(170,170,170,115);ctx.quadraticCurveTo(172,78,203,75);ctx.quadraticCurveTo(218,142,224,190);}
      else if(g==="small predator"||g==="feathered animal"||g==="early bird-like animal"||g==="early mammal"){ctx.ellipse(265,222,95,43,-.12,0,Math.PI*2);}
      else if(g==="armored herbivore"||g==="plated herbivore"){ctx.ellipse(270,222,128,60,0,0,Math.PI*2);}
      else if(g==="amphibian"){ctx.ellipse(265,237,105,40,0,0,Math.PI*2);}
      else {ctx.ellipse(265,220,g==="heavy herbivore"?142:119,g==="heavy herbivore"?70:54,-.04,0,Math.PI*2);}
      ctx.fill();
      // neck silhouette joins body to skull
      ctx.fillStyle=base;ctx.beginPath();
      if(g==="long-necked herbivore"){ctx.moveTo(175,243);ctx.bezierCurveTo(160,180,160,102,183,72);ctx.quadraticCurveTo(203,52,218,80);ctx.bezierCurveTo(202,140,224,190,237,219);ctx.closePath();}
      else if(g==="small predator"||g==="feathered animal"||g==="early bird-like animal"){ctx.moveTo(215,239);ctx.quadraticCurveTo(207,196,222,165);ctx.lineTo(269,164);ctx.quadraticCurveTo(252,218,280,246);ctx.closePath();}
      else if(g==="armored herbivore"||g==="plated herbivore"||g==="heavy herbivore"){ctx.moveTo(170,245);ctx.quadraticCurveTo(145,210,167,170);ctx.quadraticCurveTo(192,144,232,166);ctx.lineTo(252,227);ctx.closePath();}
      else if(g==="crocodile-line reptile"){ctx.moveTo(176,244);ctx.quadraticCurveTo(175,190,204,166);ctx.lineTo(252,176);ctx.lineTo(243,237);ctx.closePath();}
      else if(g==="amphibian"){ctx.moveTo(185,245);ctx.quadraticCurveTo(170,211,193,190);ctx.lineTo(262,190);ctx.quadraticCurveTo(270,225,284,246);ctx.closePath();}
      else {ctx.moveTo(182,244);ctx.quadraticCurveTo(171,199,205,163);ctx.quadraticCurveTo(230,151,255,178);ctx.lineTo(252,235);ctx.closePath();}
      ctx.fill();
      // limb hints behind the head
      if(!["long-necked herbivore","early mammal","amphibian"].includes(g)){
        ctx.strokeStyle=shade(base,-13);ctx.lineCap="round";ctx.lineWidth=g==="heavy herbivore"?24:13;
        for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(240+i*52,237);ctx.quadraticCurveTo(232+i*55,263,244+i*52,282);ctx.stroke();ctx.strokeStyle=shade(base,10);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(244+i*52,280);ctx.lineTo(260+i*52,283);ctx.stroke();ctx.strokeStyle=shade(base,-13);ctx.lineWidth=g==="heavy herbivore"?24:13;}
      }
    }
    // shading gradients across the creature
    const shadeGrad=ctx.createLinearGradient(140,80,360,280);shadeGrad.addColorStop(0,"rgba(255,226,167,.25)");shadeGrad.addColorStop(.4,"rgba(255,255,255,.025)");shadeGrad.addColorStop(1,"rgba(0,0,0,.52)");
    ctx.fillStyle=shadeGrad;
    if(g!=="giant invertebrate"){ctx.beginPath();ctx.ellipse(260,213,145,90,-.08,0,Math.PI*2);ctx.fill();}
    // texture flecks and scales clipped to body-like region
    ctx.save();ctx.beginPath();ctx.ellipse(262,215,145,83,-.08,0,Math.PI*2);ctx.clip();
    for(let i=0;i<390;i++){
      const x=128+r()*278,y=130+r()*143,sz=.4+r()*1.8;
      ctx.fillStyle=r()>.52?`rgba(224,216,176,${.025+r()*.09})`:`rgba(0,0,0,${.025+r()*.12})`;
      ctx.beginPath();ctx.ellipse(x,y,sz*1.25,sz,.2,0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<26;i++){ctx.strokeStyle=`rgba(8,12,8,${.08+r()*.12})`;ctx.lineWidth=.5+r()*.8;ctx.beginPath();let x=155+r()*220,y=150+r()*115;ctx.moveTo(x,y);ctx.quadraticCurveTo(x+5+r()*9,y+3+r()*5,x+9+r()*13,y+1);ctx.stroke();}
    ctx.restore();
    // specialized plates, armor, feathers
    if(g==="plated herbivore"||g==="armored herbivore"){
      for(let i=0;i<(g==="plated herbivore"?8:13);i++){
        let x=175+i*18,y=g==="plated herbivore"?166-Math.sin(i/8*Math.PI)*34:178+(i%2)*13;
        ctx.fillStyle=shade(i%2?mid:base,10);ctx.strokeStyle=shade(base,-25);ctx.lineWidth=1;
        ctx.beginPath();
        if(g==="plated herbivore"){ctx.moveTo(x-8,y+16);ctx.lineTo(x-7,y-4-r()*6);ctx.quadraticCurveTo(x,y-20-r()*8,x+7,y-4-r()*6);ctx.lineTo(x+10,y+16);ctx.closePath();}
        else {ctx.moveTo(x-7,y-8);ctx.lineTo(x-10,y-18);ctx.lineTo(x+1,y-24);ctx.lineTo(x+10,y-9);ctx.closePath();}
        ctx.fill();ctx.stroke();
      }
    }
    if(g==="feathered animal"||g==="early bird-like animal"){
      for(let row=0;row<4;row++)for(let i=0;i<18;i++){
        const x=196+i*7.5,y=170+row*11+Math.sin(i*.4)*4;
        ctx.save();ctx.translate(x,y);ctx.rotate(.4+row*.08);
        ctx.fillStyle=i%3?shade(mid,4):light;ctx.globalAlpha=.3+r()*.42;
        ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(8,-7,15,1);ctx.quadraticCurveTo(8,8,0,0);ctx.fill();
        ctx.strokeStyle=shade(base,-10);ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(13,1);ctx.stroke();ctx.restore();
      }
    }
    // head profile, varied skull and snout
    let hx=252,hy=128,headW=104*p.headScale,headH=65*p.headScale;
    if(g==="long-necked herbivore"){hx=203;hy=62;headW=60*p.headScale;headH=39*p.headScale;}
    if(g==="small predator"||g==="feathered animal"||g==="early bird-like animal"){hx=267;hy=137;headW=83*p.headScale;headH=48*p.headScale;}
    if(g==="armored herbivore"||g==="plated herbivore"||g==="heavy herbivore"){hx=225;hy=137;headW=78*p.headScale;headH=51*p.headScale;}
    if(g==="marine reptile"){hx=235;hy=145;headW=126*p.headScale;headH=43*p.headScale;}
    if(g==="ancient fish"){hx=242;hy=157;headW=102;headH=43;}
    if(g==="crocodile-line reptile"){hx=236;hy=151;headW=131*p.headScale;headH=43*p.headScale;}
    if(g==="early mammal"){hx=266;hy=174;headW=62;headH=39;}
    if(g==="amphibian"){hx=255;hy=179;headW=103;headH=42;}
    if(g==="giant invertebrate"){hx=365;hy=207;headW=39;headH=29;}
    // head shape with muzzle extension
    const hg=ctx.createLinearGradient(hx-headW/2,hy-headH,hx+headW/2,hy+headH);hg.addColorStop(0,light);hg.addColorStop(.36,mid);hg.addColorStop(1,shade(base,-35));
    ctx.fillStyle=hg;ctx.strokeStyle=shade(base,-35);ctx.lineWidth=1.2;
    ctx.beginPath();
    if(g==="marine reptile"||g==="crocodile-line reptile"||g==="ancient fish"){
      ctx.moveTo(hx-headW*.53,hy-headH*.23);ctx.quadraticCurveTo(hx-headW*.2,hy-headH*.8,hx+headW*.15,hy-headH*.55);
      ctx.quadraticCurveTo(hx+headW*.6,hy-headH*.35,hx+headW*.55,hy+headH*.12);
      ctx.quadraticCurveTo(hx+headW*.15,hy+headH*.7,hx-headW*.42,hy+headH*.3);ctx.closePath();
    } else if(g==="early mammal"||g==="early bird-like animal"){
      ctx.ellipse(hx,hy,headW*.5,headH*.5,-.1,0,Math.PI*2);
      if(g==="early bird-like animal"){ctx.moveTo(hx+headW*.18,hy+4);ctx.lineTo(hx+headW*.72,hy+9);ctx.lineTo(hx+headW*.2,hy+13);ctx.closePath();}
    } else {
      ctx.moveTo(hx-headW*.48,hy+headH*.18);
      ctx.quadraticCurveTo(hx-headW*.58,hy-headH*.5,hx-headW*.1,hy-headH*.55);
      ctx.quadraticCurveTo(hx+headW*.4,hy-headH*.65,hx+headW*.49,hy-headH*.05);
      ctx.quadraticCurveTo(hx+headW*.58,hy+headH*.24,hx+headW*.28,hy+headH*.4);
      ctx.quadraticCurveTo(hx-headW*.1,hy+headH*.62,hx-headW*.48,hy+headH*.18);ctx.closePath();
    }
    ctx.fill();ctx.stroke();
    // jawline and mouth; beaked/herbivorous types avoid predator teeth
    ctx.strokeStyle=shade(base,-42);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx-headW*.37,hy+headH*.28);ctx.quadraticCurveTo(hx+headW*.02,hy+headH*.55,hx+headW*.42,hy+headH*.16);ctx.stroke();
    const toothy=["large predator","small predator","marine reptile","crocodile-line reptile"];
    if(toothy.includes(g)){
      for(let i=0;i<8;i++){const tx=hx-headW*.2+i*headW*.073,ty=hy+headH*(.29+Math.sin(i/7*Math.PI)*.04);ctx.fillStyle="#ded5b7";ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+2.6,ty+6+r()*4);ctx.lineTo(tx+5,ty);ctx.closePath();ctx.fill();}
    }
    // nostril and facial folds
    ctx.fillStyle="rgba(10,13,10,.72)";ctx.beginPath();ctx.ellipse(hx+headW*.31,hy-headH*.04,3.2,2, -.2,0,Math.PI*2);ctx.fill();
    for(let i=0;i<5;i++){ctx.strokeStyle=`rgba(10,15,10,${.12+r()*.18})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(hx-headW*.22+i*4,hy+headH*.22);ctx.quadraticCurveTo(hx-headW*.18+i*4,hy+headH*.3,hx-headW*.12+i*4,hy+headH*.32);ctx.stroke();}
    // eye socket, iris, pupil, catchlight
    const ex=hx-headW*.13,ey=hy-headH*.2,er=g==="early mammal"?4.5:5.5;
    ctx.fillStyle=shade(base,-42);ctx.beginPath();ctx.ellipse(ex,ey,er*1.65,er*1.28,-.18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#0b100c";ctx.beginPath();ctx.ellipse(ex,ey,er*1.2,er*.95,-.15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p.eyeHue;ctx.beginPath();ctx.ellipse(ex+1,ey,er*.77,er*.75,-.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#10120e";ctx.beginPath();ctx.ellipse(ex+2,ey,er*.32,er*.65,-.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,247,211,.8)";ctx.beginPath();ctx.arc(ex-.9,ey-1.7,1.4,0,Math.PI*2);ctx.fill();
    // brow ridge casts a tiny shadow
    ctx.strokeStyle=shade(base,-30);ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(ex-er*1.4,ey-er*1.05);ctx.quadraticCurveTo(ex,ey-er*2.1,ex+er*1.3,ey-er*.8);ctx.stroke();
    // crest/horns only for selected anatomies
    if(["large predator","armored herbivore","heavy herbivore","plated herbivore"].includes(g)&&p.crest>.35){
      for(let i=0;i<(p.crest>.72?2:1);i++){
        const x=hx-headW*.22+i*13,y=hy-headH*.45;
        ctx.fillStyle=shade(mid,12);ctx.strokeStyle=shade(base,-25);ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x-5,y+5);ctx.quadraticCurveTo(x-5,y-10-p.crest*9,x+2,y-15-p.crest*12);ctx.quadraticCurveTo(x+7,y-3,x+6,y+6);ctx.closePath();ctx.fill();ctx.stroke();
      }
    }
    // fine scales across face and neck
    for(let i=0;i<95;i++){
      const x=hx-headW*.43+r()*headW*.78,y=hy-headH*.35+r()*headH*.66;
      ctx.fillStyle=`rgba(235,222,176,${.04+r()*.12})`;ctx.beginPath();ctx.ellipse(x,y,.8+r()*1.2,.5+r()*.8,.2,0,Math.PI*2);ctx.fill();
    }
    // environmental rim light and floating motes
    ctx.save();ctx.globalCompositeOperation="screen";
    ctx.strokeStyle=`rgba(198,190,133,${.11+p.lighting*.025})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(hx-10,hy+25,headW*.55,headH*.73,-.15,Math.PI*1.05,Math.PI*1.8);ctx.stroke();
    ctx.restore();
    for(let i=0;i<28;i++){ctx.fillStyle=`rgba(212,207,164,${.08+r()*.18})`;ctx.beginPath();ctx.arc(r()*480,r()*330,.3+r()*1.1,0,Math.PI*2);ctx.fill();}
    // vignette and subtle film-like grade
    const vig=ctx.createRadialGradient(240,150,90,240,165,310);vig.addColorStop(0,"rgba(0,0,0,0)");vig.addColorStop(1,"rgba(0,0,0,.62)");ctx.fillStyle=vig;ctx.fillRect(0,0,480,330);
    ctx.restore();
  }
  function shade(hex,amt){
    const n=parseInt(hex.slice(1),16),r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);
    return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }
  function cachePortrait(id,canvas){
    cache.delete(id);cache.set(id,canvas);
    while(cache.size>CACHE_LIMIT){const key=cache.keys().next().value;cache.delete(key);}
  }
  function portrait(canvas,p){
    const cached=cache.get(p.id);
    if(cached){const ctx=canvas.getContext("2d");const rect=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.floor(rect.width));canvas.height=Math.max(1,Math.floor(rect.height));ctx.drawImage(cached,0,0,canvas.width,canvas.height);return;}
    drawPortrait(canvas,p);
    // Keep the cached copy small and bounded; regenerate at any time from the stable seed.
    const copy=document.createElement("canvas");copy.width=canvas.width;copy.height=canvas.height;
    copy.getContext("2d").drawImage(canvas,0,0);cachePortrait(p.id,copy);
  }
  function makeCard(id) {
    const p=createProfile(id), card=document.createElement("article");card.className="creature-card";card.dataset.id=id;
    const portraitWrap=document.createElement("div");portraitWrap.className="portrait-wrap";
    const canvas=document.createElement("canvas");canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`${p.name}, a fictional ${p.blueprint.type.toLowerCase()}`);
    const label=document.createElement("span");label.className="portrait-label";label.textContent="FIELD PORTRAIT / "+String(p.variant).padStart(6,"0");
    const corner=document.createElement("span");corner.className="portrait-corner";corner.innerHTML="TYRAVORN<br>SPECIMEN ARCHIVE";
    portraitWrap.append(canvas,label,corner);
    const info=document.createElement("div");info.className="creature-info";
    const line=document.createElement("div");line.className="identity-line";line.innerHTML=`<span>ARCHIVE IDENTITY</span><span class="profile-id">#${escapeHTML(id)}</span>`;
    const name=document.createElement("h3");name.className="creature-name";name.textContent=p.name;
    const cat=document.createElement("div");cat.className="category";cat.textContent=p.blueprint.type;
    const traits=document.createElement("div");traits.className="traits";
    traits.append(trait("GEOLOGICAL EPOCH",p.epoch.name),trait("HABITAT",p.habitat),trait("ESTIMATED SIZE",p.size),trait("DISTINCTIVE FEATURE",p.traits));
    const desc=document.createElement("p");desc.className="description";desc.textContent=p.behavior+" This is an original fictional identity, not a documented species.";
    const actions=document.createElement("div");actions.className="card-actions";
    const open=document.createElement("button");open.className="primary-action";open.textContent="OPEN PROFILE ↗";open.addEventListener("click",()=>openDirect(id));
    const copy=document.createElement("button");copy.textContent="COPY PERMANENT LINK";copy.addEventListener("click",()=>copyLink(id,copy));
    const habitat=document.createElement("a");habitat.href="#field-notes";habitat.textContent="FIELD NOTES";habitat.addEventListener("click",e=>{e.preventDefault();showNotice(`${p.name} · ${p.epoch.name} · ${p.habitat}. Fictional creature generated deterministically from ID ${id}.`);});
    actions.append(open,copy,habitat);info.append(line,name,cat,traits,desc,actions);card.append(portraitWrap,info);
    requestAnimationFrame(()=>{try{portrait(canvas,p);}catch(err){canvas.width=480;canvas.height=330;const c=canvas.getContext("2d");c.fillStyle="#182319";c.fillRect(0,0,480,330);c.fillStyle="#d1bd82";c.font="18px monospace";c.fillText("PORTRAIT RECOVERY",28,160);}});
    return card;
  }
  function trait(label,value){const d=document.createElement("div");d.className="trait";const s=document.createElement("small");s.textContent=label;const v=document.createElement("span");v.textContent=value;d.append(s,v);return d;}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function validID(s){return typeof s==="string"&&/^\d+$/.test(s)&&s.length>0&&s.length<=10000;}
  function normalizeID(s){s=s.replace(/^0+(?=\d)/,"");return s||"0";}
  function showNotice(msg){notice.hidden=false;notice.textContent=msg;}
  async function copyLink(id,button){
    const url=new URL(location.href);url.searchParams.set("profile",id);url.hash="";
    try{await navigator.clipboard.writeText(url.href);button.textContent="LINK COPIED ✓";}
    catch{showNotice("Permanent profile link: "+url.href);button.textContent="LINK SHOWN ABOVE";}
    setTimeout(()=>button.textContent="COPY PERMANENT LINK",1800);
  }
  function clearList(){list.replaceChildren();}
  function openDirect(id,push=true){
    activeDirect=true;streamPaused=true;clearList();sentinel.style.display="none";
    const card=makeCard(id);list.append(card);currentNumber.textContent=id;
    notice.hidden=true;
    if(push){const url=new URL(location.href);url.searchParams.set("profile",id);url.hash="";history.pushState({profile:id}, "",url);}
    $("#backToStream").style.display="inline";
    window.scrollTo({top:Math.max(0,list.getBoundingClientRect().top+window.scrollY-18),behavior:"smooth"});
    document.title=`${createProfile(id).name} #${id} — TYRAVORN`;
  }
  function goHome(push=true){
    activeDirect=false;streamPaused=false;sentinel.style.display="flex";clearList();nextId="1";renderInitial();
    if(push){const url=new URL(location.href);url.searchParams.delete("profile");url.hash="";history.pushState({home:true},"",url);}
    $("#backToStream").style.display="none";document.title="TYRAVORN — Infinite Jurassic World";
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderInitial(){
    const frag=document.createDocumentFragment();
    for(let i=0;i<INITIAL_PROFILES;i++){
      frag.append(makeCard(nextId));
      nextId=incrementDecimal(nextId);
    }
    list.append(frag);
    currentNumber.textContent="1";
  }
  function incrementDecimal(s){
    const a=s.split("");let i=a.length-1;
    while(i>=0&&a[i]==="9"){a[i]="0";i--;}
    if(i<0)a.unshift("1");else a[i]=String(Number(a[i])+1);
    return a.join("");
  }
  function appendMore(){
    if(streamPaused||activeDirect)return;
    const frag=document.createDocumentFragment();
    for(let i=0;i<GENERATE_BATCH;i++){
      frag.append(makeCard(nextId));
      nextId=incrementDecimal(nextId);
    }
    list.append(frag);
    // Keep a bounded rolling window of rendered cards for mobile performance.
    while(list.children.length>MAX_CARDS)list.firstElementChild.remove();
    const first=list.firstElementChild;
    if(first&&first.dataset.id)currentNumber.textContent=first.dataset.id;
  }
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))appendMore();},{rootMargin:"900px 0px"});
  observer.observe(sentinel);
  searchForm.addEventListener("submit",e=>{
    e.preventDefault();const raw=searchInput.value.trim();
    if(!validID(raw)){showNotice("Enter a positive decimal profile ID using digits only. IDs can be extraordinarily long; no scientific notation or separators.");return;}
    const id=normalizeID(raw);openDirect(id);
  });
  searchInput.addEventListener("input",()=>{if(!searchInput.value.trim())notice.hidden=true;});
  $("#backToStream").addEventListener("click",()=>goHome());
  window.addEventListener("popstate",()=>{
    const id=new URL(location.href).searchParams.get("profile");
    if(id!==null&&validID(id))openDirect(normalizeID(id),false);else goHome(false);
  });
  // URL-based permanent profile routes work on static hosting without server rewrites.
  const initial=new URL(location.href).searchParams.get("profile");
  if(initial!==null&&validID(initial))openDirect(normalizeID(initial),false);else renderInitial();
})();
