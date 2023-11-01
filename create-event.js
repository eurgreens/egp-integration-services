exports.createEvent = async (event) => {
  const newEventProperties = {
    properties: {
      event_name: event.title,
      tito_id: event.id,
      event_url: event.url,
      start_date: event.start_date,
      end_date: event.end_date,
    },
  };
  const newEventRequest = await fetch('https://api.hubapi.com/crm/v3/objects/2-117029034', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AUTH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newEventProperties),
  });
  await new Promise((r) => setTimeout(r, 500));

  const responseNewEventRequest = await newEventRequest.json();
  // console.log('event created')
  return responseNewEventRequest;
};
