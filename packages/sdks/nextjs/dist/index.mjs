"use client";import d,{useEffect as p,useRef as a}from"react";import{usePathname as u,useSearchParams as w}from"next/navigation";function m({projectId:r,cdnUrl:o="https://cdn.openpreview.dev/opv2.js"}){let t=u(),i=w(),e=a(null),c=a(!1);return p(()=>{if(typeof window>"u")return;let s=()=>{window.OpenPreview&&!c.current&&(window.OpenPreview.init({projectId:r,path:t,search:i.toString()}),c.current=!0)};if(e.current)s();else{let n=document.createElement("script");n.src=o,n.async=!0,n.onload=s,document.body.appendChild(n),e.current=n}return()=>{e.current&&document.body.contains(e.current)&&document.body.removeChild(e.current)}},[r,t,i,o]),p(()=>{window.OpenPreview&&window.OpenPreview.init({projectId:r,path:t,search:i.toString()})},[r,t,i]),d.createElement("div",{id:"openpreview-container"})}export{m as OpenPreview};