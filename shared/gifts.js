export const GIFTS = [
 {id:'flowers',name:'봄날의 꽃다발',detail:'품에 안기는 작은 꽃 한 아름',slot:'hand',color:'#e8b2a7'},
 {id:'ribbon',name:'커다란 리본',detail:'오늘만큼은 조금 특별하게',slot:'neck',color:'#aebbd9'},
 {id:'cape',name:'별빛 망토',detail:'주인공의 어깨 위에 반짝임을',slot:'back',color:'#b7accc'},
 {id:'glasses',name:'파티 안경',detail:'함께 웃을 준비가 됐어요',slot:'face',color:'#d6ba79'},
];
export const findGift = id => GIFTS.find(gift=>gift.id===id);
