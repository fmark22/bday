import React from 'react';
const positions={flowers:0,ribbon:100/3,cape:200/3,glasses:100};
export default function GiftIcon({item}){
 return <span className="gift-art" aria-hidden="true" style={{backgroundPosition:`${positions[item]??0}% center`}}/>;
}
