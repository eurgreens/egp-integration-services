// association type for the member party with put. association after user creation

exports.checkMemberParty = async (user) => {
  let memberPartyUser = '';
  const memberPartiesObject = await fetch('https://api.hubapi.com/crm/v3/objects/2-117824001?limit=100', {
    headers: {
      Authorization: `Bearer ${process.env.AUTH}`,
      'Content-Type': 'application/json',
    },
  });
  const responseMemberPartiesObjects = await memberPartiesObject.json();

  console.log('Length size: ', responseMemberPartiesObjects.results.length);

  for (const party of responseMemberPartiesObjects.results) {
    const memberParty = await fetch(
      `https://api.hubapi.com/crm/v3/objects/2-117824001/${party.id}?properties=member_party_name`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const memberPartyResponse = await memberParty.json();

    if (user.responses['party']) {
      if (user.responses['party'] == memberPartyResponse.properties.member_party_name) {
        memberPartyUser = Number(memberPartyResponse.id);
        break;
      }
    }
  }
  return memberPartyUser;
};
