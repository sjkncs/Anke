/* Pen-and-paper education companion, matching ANKE Bot's house silhouette. */
(function(global){
  'use strict';
  function paint(ctx,t=0,mouth=0,blink=0,gaze={x:0,y:0},seed=0){
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#494b4d';ctx.lineWidth=2.2;
    const path=(d,fill,stroke=true)=>{const p=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(p);}if(stroke)ctx.stroke(p);};
    ctx.fillStyle='#494b4d12';ctx.beginPath();ctx.ellipse(50,93,27,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(0,Math.sin(t*1.6)*.65);
    path('M28 55Q9 55 7 37Q13 40 21 40Q13 31 16 26Q24 34 34 36Z','#efefeb');
    path('M72 55Q91 55 93 37Q87 40 79 40Q87 31 84 26Q76 34 66 36Z','#efefeb');
    path('M38 76L35 87Q27 87 27 91Q33 94 41 90L44 77M59 77L61 90Q69 94 75 91Q74 87 66 86L65 76','#faf9f6');
    path('M24 37L50 14L77 37L76 77L25 78Z','#faf9f6');
    path('M19 40Q34 25 50 13Q65 25 81 40',null);
    ctx.lineWidth=.7;ctx.strokeStyle='#b9bbb6';path('M28 39L28 70M31 36L31 44M72 43L72 70',null);
    ctx.lineWidth=2;ctx.strokeStyle='#494b4d';
    // A small mortarboard and an open notebook identify education without changing identity.
    path('M32 18L51 10L70 18L51 25Z','#e8e9e5');path('M39 23L39 29Q51 34 63 28L63 23',null);path('M69 18L72 31',null);
    const eyeH=Math.max(.45,3.1*(1-Math.min(1,blink*1.6)));
    ctx.fillStyle='#494b4d';for(const x of [39,63]){ctx.beginPath();ctx.ellipse(x+gaze.x*.7,44+gaze.y*.5,2.3,eyeH,0,0,Math.PI*2);ctx.fill();}
    if(seed%3===0){ctx.lineWidth=1;path('M31 40Q39 37 46 40L46 48Q39 51 32 48ZM56 40Q63 37 70 40L70 48Q63 51 56 48ZM46 43L56 43',null);ctx.lineWidth=2;}
    if(mouth>.12){ctx.fillStyle='#494b4d';ctx.beginPath();ctx.ellipse(51,53,4.5,1.3+mouth*4,0,0,Math.PI*2);ctx.fill();}else path('M46 51Q51 56 56 51',null);
    ctx.strokeStyle='#b7a89c';ctx.lineWidth=1.5;path('M31 51L35 52M67 52L71 50',null);
    ctx.strokeStyle='#494b4d';ctx.lineWidth=1.7;
    path('M29 65Q40 60 50 65Q61 60 72 65L71 79Q60 75 50 80Q40 75 29 79Z','#efefeb');path('M50 66L50 79',null);
    ctx.strokeStyle='#a7aaa7';ctx.lineWidth=.65;path('M34 68L44 67M34 72L44 71M56 67L66 68M56 71L66 72',null);
    ctx.restore();
  }
  function seedFor(name){let h=2166136261;const text=String(name);for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function avatar(name){const canvas=document.createElement('canvas');canvas.width=canvas.height=100;paint(canvas.getContext('2d'),0,0,0,{x:0,y:0},seedFor(name));return canvas.toDataURL('image/png');}
  global.AnkeEducationArt={paint,avatar,seedFor};
})(window);
