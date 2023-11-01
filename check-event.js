exports.checkEventExist = async (id) => {
  const data = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'tito_id',
            operator: 'EQ',
            value: id,
          },
        ],
      },
    ],
  };
  const checkEvent = await fetch('https://api.hubapi.com/crm/v3/objects/events/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AUTH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const resultEvents = await checkEvent.json();
  if (resultEvents.results.length == 0) {
    // console.log('event not exist')
    return false;
  } else {
    // console.log('event exist')
    return resultEvents.results[0].id;
  }
};
