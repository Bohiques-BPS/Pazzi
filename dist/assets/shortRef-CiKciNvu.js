function n(e){const t=String(e??"").trim();if(!t)return"";const r=t.match(/^(\d{6,})-[0-9a-f]{16,}$/i);return r?r[1]:t.length>=24&&!/\s/.test(t)?`…${t.slice(-8).toUpperCase()}`:t}export{n as s};
