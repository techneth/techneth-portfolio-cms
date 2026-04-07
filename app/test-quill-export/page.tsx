'use client'
import { useState, useEffect } from 'react';
export default function Test() {
  const [out, setOut] = useState('loading');
  useEffect(() => {
    import('react-quill-new').then((m: any) => {
       setOut("Keys: " + Object.keys(m).join(', ') + " | has Quill: " + !!m.Quill + " | default has Quill: " + !!m.default?.Quill);
       console.log("react-quill-new module:", m);
    }).catch(e => setOut(e.message));
  }, []);
  return <div>{out}</div>;
}
