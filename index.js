const express = require('express');
const createUser = require('./create-user.js');
const updateUser = require('./update-user.js');
const checkEvent = require('./check-event.js');
const checkUser = require('./check-user-exist.js');
const createEvent = require('./create-event.js');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

app.post('/event-registration', async (req, res) => {
  let event = {};
  const request = req.body;
  if (!request) {
    console.log('no body');
    return;
  }

  console.log('[EVENT_REGISTRATION] Check event exist');
  console.log('[EVENT_REGISTRATION] Request body: ', JSON.stringify(request));

  // check event exists or not if not create if exists return event id from hubspot
  let eventId = await checkEvent.checkEventExist(request.event.id);

  if (!eventId) {
    const newEvent = await createEvent.createEvent(request.event);
    eventId = newEvent.id;
    console.log('[EVENT_REGISTRATION] Event ID not found. New event created, id: ', eventId);
  }

  // from tickets loop and check if ticket users exists or not
  for (const ticket of request.tickets) {
    let userId = '';
    const userExist = await checkUser.checkUserExist(ticket);
    if (userExist == 'error') {
      userId = await createUser.createUser(ticket, request.event, eventId);
    } else {
      userId = await updateUser.updateUser(userExist, ticket, request.event, eventId);
    }

    // Registered
    let data = {
      email: ticket.email || '',
      event_name: request.event.title || '',
      event_status: 'Registered',
      first_name: ticket.first_name || '',
      last_name: ticket.last_name || '',
    };

    if (!data.email) {
      console.log('[EVENT_REGISTRATION] Event timeline NOT triggered. Empty email.');
      continue;
    }

    const addTimeLineEvent = await fetch('https://hook.eu2.make.com/2wpuq49isnofksrg5nq89hqfgmtxaju1', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (addTimeLineEvent.ok) {
      console.log('[EVENT_REGISTRATION] Event timeline triggered. Data: ', JSON.stringify(data));
    }
  }

  console.log('[EVENT_REGISTRATION] Finish');
  res.send(event);
});

app.post('/event-cancel', async (req, res) => {
  let event = {};
  const request = req.body;

  if (!request) {
    res.send('no body');
    return;
  }

  console.log('[EVENT_CANCEL] Check event exist');
  console.log('[EVENT_CANCEL] Request body: ', JSON.stringify(request));

  // check event exists or not if not create if exists return event id from hubspot
  const eventId = await checkEvent.checkEventExist(request.event.id);
  if (!eventId) {
    const newEvent = await event.createEvent(request.event);
    event = newEvent;
    console.log('[EVENT_CANCEL] Event ID not found. New event created, id: ', eventId);
  }

  // from tickets loop and check if ticket users exists or not
  if (request.tickets && request.tickets.length > 0) {
    for (const ticket of request.tickets) {
      let userId = '';
      const userExist = await checkUser.checkUserExist(ticket);
      if (userExist == 'error') {
        userId = await createUser.createUser(ticket, request.event, true);
      } else {
        userId = await updateUser.updateUser(userExist, ticket, request.event, eventId, true);
      }

      // Cancelled
      let data = {
        email: ticket.email || '',
        event_name: request.event.title || '',
        event_status: 'Cancelled',
        first_name: ticket.first_name || '',
        last_name: ticket.last_name || '',
      };

      if (!data.email) {
        console.log('[EVENT_CANCEL] Event timeline NOT triggered. Empty email.');
        continue;
      }

      const addTimeLineEvent = await fetch('https://hook.eu2.make.com/2wpuq49isnofksrg5nq89hqfgmtxaju1', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (addTimeLineEvent.ok) {
        console.log('[EVENT_CANCEL] Event timeline triggered. Data: ', JSON.stringify(data));
      }
    }
  }

  console.log('[EVENT_CANCEL] Finish');
  res.send('cancel');
});

app.post('/event-attendence', async (req, res) => {
  console.log('[EVENT_ATTENDENCE] Check in place');
  let event = {};
  const request = req.body;

  if (!request) {
    res.send('no body');
    return;
  }

  console.log('[EVENT_ATTENDENCE] Request body: ', JSON.stringify(request));

  // Attended
  let data = {
    email: request.email || '',
    event_name: request.event?.title || '',
    event_status: 'Attended',
    first_name: request.first_name || '',
    last_name: request.last_name || '',
  };

  if (!data.email) {
    console.log('[EVENT_CANCEL] Event timeline NOT triggered. Empty email.');
    console.log('[EVENT_ATTENDENCE] Finish');
    return;
  }

  const addTimeLineEvent = await fetch('https://hook.eu2.make.com/2wpuq49isnofksrg5nq89hqfgmtxaju1', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (addTimeLineEvent.ok) {
    console.log('[EVENT_ATTENDENCE] Event timeline triggered. Data: ', JSON.stringify(data));
  }

  console.log('[EVENT_ATTENDENCE] Finish');
});

app.use('/speakers', async (req, res) => {
  try {
    let finalUsers = [];
    const listPeople = await fetch('https://api.hubapi.com/contacts/v1/lists/79/contacts/all', {
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
      },
    });
    const results = await listPeople.json();
    // results.contacts.map(item => console.log(item.properties))
    for (const contact of results.contacts) {
      const userFull = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contact.vid}?properties=jobTitle,firstName,lastName,bio`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH}`,
          },
        }
      );
      const userResponse = await userFull.json();
      finalUsers.push({
        name: userResponse.properties.firstname,
        code: userResponse.properties.vid,
        last_name: userResponse.properties.lastname,
        job_title: userResponse.properties.jobtitle,
        bio: userResponse.properties.bio,
      });
    }

    res.set('Access-Control-Allow-Origin', '*');
    res.send(finalUsers);
  } catch (e) {
    res.send('error');
  }
});

app.get('/motion-tools', async (req, res) => {
  console.log('request from make.com recieved');
  let listUsers = [];
  const lists = await fetch('https://api.hubapi.com/contacts/v1/lists?count=200', {
    headers: {
      Authorization: `Bearer ${process.env.AUTH}`,
    },
  });
  const results = await lists.json();

  const motionToolLists = results.lists
    .filter((item) => item.name.includes('Motion tool'))
    .map((item) => ({ name: item.name, id: item.listId }));
  for (const list of motionToolLists) {
    let usersValues = [];
    const listValues = await fetch(`https://api.hubapi.com/contacts/v1/lists/${list.id}/contacts/all`, {
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
      },
    });
    const listValuesResponse = await listValues.json();

    // const usersValues = listValuesResponse.contacts.map(item => {
    for (const item of listValuesResponse.contacts) {
      let company = '';

      const getContactProperties = await fetch(`https://api.hubapi.com/contacts/v1/contact/vid/${item.vid}/profile`, {
        headers: {
          Authorization: `Bearer ${process.env.AUTH}`,
        },
      });

      const getConactPropResponse = await getContactProperties.json();

      const getMemberParty = await fetch(
        `https://api.hubspot.com/crm/v3/objects/contacts/${item.vid}?associations=2-117824001`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH}`,
          },
        }
      );

      const responseMemberParty = await getMemberParty.json();
      if (responseMemberParty?.associations?.p26289884_member_parties) {
        for (const party of responseMemberParty.associations.p26289884_member_parties.results) {
          if (party.type == 'contact_to_member_parties') {
            const getPartyName = await fetch(
              `https://api.hubapi.com/crm/v3/objects/2-117824001/${party.id}?properties=member_party_name`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.AUTH}`,
                },
              }
            );
            const responsePartyName = await getPartyName.json();
            company = responsePartyName.properties.member_party_name;
          }
        }
      }
      // const hasCompany = getConactPropResponse['associated-company'].properties?.type?.value
      // if(hasCompany){
      //   company = getConactPropResponse['associated-company'].properties.name.value
      // }

      const userEmail = item['identity-profiles'][0].identities.filter((item) => item.type === 'EMAIL')[0].value;
      usersValues.push({
        vid: item.vid,
        name: item.properties.firstname ? item.properties.firstname.value : '',
        lastName: item.properties.lastname ? item.properties.lastname.value : '',
        party: company,
        email: userEmail,
      });
    }

    const listName = list.name.split('|')[1].trim();

    //append to final list users
    listUsers.push({ listName: listName, users: usersValues });
  }

  //send data to motion tool
  const sendData = await fetch('https://egp-test.discuss.green/webhook/usersync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'Test1234' },
    body: JSON.stringify(listUsers),
  });
  const responseSendData = await sendData.json();

  res.send(JSON.stringify(responseSendData));
});

app.post('/list-users', async (req, res) => {
  const request = req.body;

  console.log(request.listId);

  if (!request) {
    res.send('no body');
    return;
  }
  let users = [];
  let lastResult = [];
  let param = '';
  // const getusersList = await fetch('https://api.hubapi.com/contacts/v1/lists/216/contacts/all', {
  //   headers: {
  //     Authorization: `Bearer ${process.env.AUTH}`
  //   }
  // })
  // const responseGetUsersList = await getusersList.json()
  // const usersIds = responseGetUsersList.contacts.map(item => item.vid)
  // users.push(usersIds)
  do {
    // try catch to catch any errors in the async api call
    try {
      // use node-fetch to make api call

      const getusersList = await fetch(
        `https://api.hubapi.com/contacts/v1/lists/${request.listId}/contacts/all?count=100${
          param ? `&vidOffset=${param}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH}`,
          },
        }
      );
      const responseGetUsersList = await getusersList.json();

      lastResult = responseGetUsersList;

      const usersIds = responseGetUsersList.contacts.map((item) => item.vid);
      users.push(...usersIds);

      param = lastResult['vid-offset'];
    } catch (err) {
      console.error(`Oeps, something is wrong ${err}`);
    }
    // keep running until there's no next page
  } while (lastResult['has-more'] == true);

  res.send(users);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
