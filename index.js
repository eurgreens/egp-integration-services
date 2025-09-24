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
  // for (const ticket of request.tickets) {
  let userId = '';
  const userExist = await checkUser.checkUserExist(request);
  if (userExist == 'error') {
    userId = await createUser.createUser(request, request.event, eventId);
  } else {
    userId = await updateUser.updateUser(userExist, request, request.event, eventId);
  }

  // Registered
  let data = {
    email: request.email || '',
    event_name: request.event.title || '',
    event_status: 'Registered',
    first_name: request.first_name || '',
    last_name: request.last_name || '',
  };

  if (!data.email) {
    console.log('[EVENT_REGISTRATION] Event timeline NOT triggered. Empty email.');
  } else {
    const addTimeLineEvent = await fetch('https://hook.eu2.make.com/2wpuq49isnofksrg5nq89hqfgmtxaju1', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (addTimeLineEvent.ok) {
      console.log('[EVENT_REGISTRATION] Event timeline triggered. Data: ', JSON.stringify(data));
    }
  }
  // }

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

  // void ticket
  let userId = '';
  const userExist = await checkUser.checkUserExist(request);
  if (userExist == 'error') {
    //userId = await createUser.createUser(ticket, request.event, true);
  } else {
    userId = await updateUser.updateUser(userExist, request, request.event, eventId, true);
  }

  // Cancelled
  let data = {
    email: request.email || '',
    event_name: request.event.title || '',
    event_status: 'Cancelled',
    first_name: request.first_name || '',
    last_name: request.last_name || '',
  };

  if (!data.email) {
    console.log('[EVENT_CANCEL] Event timeline NOT triggered. Empty email.');
    return;
  }

  const addTimeLineEvent = await fetch('https://hook.eu2.make.com/2wpuq49isnofksrg5nq89hqfgmtxaju1', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (addTimeLineEvent.ok) {
    console.log('[EVENT_CANCEL] Event timeline triggered. Data: ', JSON.stringify(data));
  }

  console.log('[EVENT_CANCEL] Finish');
  res.send('cancel');
});

app.post('/event-attendence', async (req, res) => {
  console.log('[EVENT_ATTENDENCE] Check in place');

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
    const listPeople = await fetch('https://api.hubapi.com/crm/v3/lists/95/memberships', {
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
      },
    });
    const results = await listPeople.json();
    // results.contacts.map(item => console.log(item.properties))
    for (const contact of results.results) {
      const userFull = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contact.recordId}?properties=jobTitle,firstName,lastName,bio`,
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
  console.log('[MOTION_TOOLS] request from make.com recieved');
  res.send({ status: 200 });
  let listUsers = [];

  try {
    const lists = await fetch('https://api.hubapi.com/crm/v3/lists/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Motion tool',
      }),
    });
    const results = await lists.json();

    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const motionToolLists = (results.lists || [])
      .filter((item) => {
        // Exclude if name contains 'stop sync' (case-insensitive)
        if (typeof item.name !== 'string') return false;
        if (item.name.toLowerCase().includes('stop sync')) return false;
        // Exclude if updatedAt is older than 1 year ago
        // Accept both string and number timestamps
        let updatedAt = item.updatedAt;
        if (typeof updatedAt === 'string') updatedAt = Date.parse(updatedAt);
        if (!updatedAt || updatedAt < oneYearAgo) return false;
        return true;
      })
      .map((item) => ({ name: item.name, id: item.listId }));

    if (motionToolLists.length == 0) {
      console.log('No list to sync');
      return;
    }
    for (const list of motionToolLists) {
      let usersValues = [];
      let after = undefined;
      const allContacts = [];

      async function fetchContacts() {
        try {
          while (true) {
            let url = `https://api.hubapi.com/crm/v3/lists/${list.id}/memberships?limit=100`;
            if (after) url += `&after=${encodeURIComponent(after)}`;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AUTH}` } });

            if (response.ok) {
              const data = await response.json();
              const contacts = data.results || [];
              if (contacts.length === 0) {
                break;
              }

              allContacts.push(...contacts);

              if (data.paging.next && data.paging.next.after) {
                after = data.paging.next.after;
              } else {
                break;
              }
            } else {
              console.error(`[MOTION_TOOLS] Error: ${response.status} - ${await response.text()}`);
              break;
            }
          }

          // Now 'allContacts' contains all the contacts from the list
          console.log(`[MOTION_TOOLS] Total contacts retrieved: ${allContacts.length}`);
          return allContacts;
        } catch (error) {
          console.error('[MOTION_TOOLS] An error occurred:', JSON.stringify(error));
        }
      }
      const contacts = await fetchContacts();

      for (const item of contacts) {
        let company = '';

        try {
          const getContactProperties = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${item.recordId}`, {
            headers: { Authorization: `Bearer ${process.env.AUTH}` },
          });

          const getConactPropResponse = await getContactProperties.json();

          const getMemberParty = await fetch(
            `https://api.hubspot.com/crm/v3/objects/contacts/${item.recordId}?associations=2-117824001`,
            { headers: { Authorization: `Bearer ${process.env.AUTH}` } }
          );

          const responseMemberParty = await getMemberParty.json();

          if (responseMemberParty?.associations?.p26289884_member_parties) {
            for (const party of responseMemberParty.associations.p26289884_member_parties.results) {
              if (party.type == 'contact_to_member_parties') {
                const getPartyName = await fetch(
                  `https://api.hubapi.com/crm/v3/objects/2-117824001/${party.id}?properties=member_party_name`,
                  { headers: { Authorization: `Bearer ${process.env.AUTH}` } }
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

          const userEmail = getConactPropResponse.properties.email ?? null;

          // Add only if user has an email
          if (userEmail) {
            usersValues.push({
              vid: getConactPropResponse.id,
              name: getConactPropResponse.properties.firstname ? getConactPropResponse.properties.firstname : '',
              lastName: getConactPropResponse.properties.lastname ? getConactPropResponse.properties.lastname : '',
              party: company,
              email: userEmail,
            });
          }
        } catch (e) {
          console.error('[MOTIONS_TOOLS] ERROR: ', JSON.stringify(e));
          //res.send('error');
        }
      }

      const listName = list.name.split('|')[1].trim();
      listUsers.push({ listName: listName, users: usersValues });
      console.log(`[MOTIONS_TOOLS] Users to update: ${listUsers.length}`);
    }

    // Filtrar todas las listas cuyo valor 'users' esta vacio
    const filteredListUsers = listUsers.filter((item) => Array.isArray(item.users) && item.users.length > 0);
    // console.log('List users: ', JSON.stringify(filteredListUsers));

    console.log('[MOTION_TOOLS] Sending data to motion tool.');
    const sendData = await fetch(process.env.MOTION_TOOLS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': process.env.MOTION_TOOLS_API_KEY },
      body: JSON.stringify(filteredListUsers),
    });

    console.log('[MOTIONS_TOOLS] Finish with success.');
  } catch (error) {
    console.log('[MOTIONS_TOOLS] ERROR: ', JSON.stringify(error));
    console.log('[MOTIONS_TOOLS] ERROR: ', error);
  }
});

app.post('/list-users', async (req, res) => {
  const request = req.body;

  console.log('[LIST_USERS] ', request.listId);

  if (!request) {
    res.send('no body');
    return;
  }
  let users = [];
  let after = undefined;

  while (true) {
    let url = `https://api.hubapi.com/crm/v3/lists/${request.listId}/memberships?limit=100`;
    if (after) url += `&after=${encodeURIComponent(after)}`;

    const getusersList = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.AUTH}` },
    });
    const responseGetUsersList = await getusersList.json();

    if (responseGetUsersList.results && responseGetUsersList.results.length > 0) {
      const usersIds = responseGetUsersList.results.map((item) => item.recordId);
      users.push(...usersIds);
    }

    if (responseGetUsersList.paging && responseGetUsersList.paging.next && responseGetUsersList.paging.next.after) {
      after = responseGetUsersList.paging.next.after;
    } else {
      break;
    }
  }
  res.send(users);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
