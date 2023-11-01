const utils = require('./utils');
const member = require('./check-member-party');
const company = require('./check-user-company');

exports.createUser = async (user, titoEvent, eventId, cancel = false) => {
  console.log('[CREATE_USER] Creating new user. Response: ', JSON.stringify(user));

  let userId = '';
  let companyId = '';

  // associtation type for the event
  let associationTypeEvent = 167;
  if (user.release.metadata) {
    associationTypeEvent = await utils.assocTypeId(user.release.metadata.association);
  }

  const checkMemberParty = await member.checkMemberParty(user);
  const responseMemberParty = checkMemberParty;

  // get company from field value in hubspot
  if (user.responses['organisation']) {
    const checkCompany = await company.checkUserCompany(user);
    console.log('[CREATE_USER] Company id: ', checkCompany);
    companyId = checkCompany;
  }

  // Test
  let representativeValues = '';
  if (user.responses['representative']) {
    const rawValues = user.responses['representative'];
    const elements = rawValues.split(', ');
    const filteredElements = elements.filter((element) => element.trim() !== '');
    const formattedString = filteredElements.join(';');
    representativeValues = formattedString;
  }

  let staffValues = '';
  if (user.responses['staff']) {
    const rawValues = user.responses['staff'];
    const elements = rawValues.split(', ');
    const filteredElements = elements.filter((element) => element.trim() !== '');
    const formattedString = filteredElements.join(';');
    staffValues = formattedString;
  }

  let newUserProperties = {};
  if (cancel) {
    newUserProperties = {
      properties: {
        firstname: user.first_name,
        lastname: user.last_name,
        company: user.company_name,
        email: user.email,
        elected_official_type_v2: user.responses['representative'] ? representativeValues : null,
        staff_or_volunteer_type_v2: user.responses['staff'] ? staffValues : null,
      },
    };
  } else {
    newUserProperties = {
      properties: {
        firstname: user.first_name,
        lastname: user.last_name,
        company: user.company_name,
        email: user.email,
        elected_official_type_v2: user.responses['representative'] ? representativeValues : null,
        staff_or_volunteer_type_v2: user.responses['staff'] ? staffValues : null,
      },
      associations: [
        {
          to: {
            id: eventId,
          },
          types: [
            {
              associationCategory: 'USER_DEFINED',
              associationTypeId: associationTypeEvent,
            },
          ],
        },
      ],
    };
  }

  console.log(
    `[TEST] member party: ${responseMemberParty}. company: ${user.responses['organisation']}. company id: ${companyId}`
  );

  // add member party association
  if (responseMemberParty) {
    console.log('[CREATE_USER] Member party value: ', responseMemberParty);
    newUserProperties.associations.push({
      to: {
        id: responseMemberParty,
      },
      types: [
        {
          associationCategory: 'USER_DEFINED',
          associationTypeId: user.responses['role'] ? getRoleMapping(user.responses['role']) : 129,
        },
      ],
    });
  }

  // add company has association
  if (companyId) {
    newUserProperties.associations.push({
      to: {
        id: companyId,
      },
      types: [
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 1,
        },
      ],
    });
  }

  // create user
  try {
    const createUser = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUserProperties),
    });
    const responseCreateuser = await createUser.json();
    if (responseCreateuser.status == 'error') {
      console.log(responseCreateuser);
      throw new Error('error');
    }
    userId = responseCreateuser.id;
  } catch (e) {
    console.log(e);
  }

  // update legals
  const legalEventsBody = {
    emailAddress: user.email,
    subscriptionId: 239874603,
    legalBasis: 'CONSENT_WITH_NOTICE',
    legalBasisExplanation: `People opted in through event forms for the ${titoEvent.title}`,
  };

  const legalMktBody = {
    emailAddress: user.email,
    subscriptionId: 153977537,
    legalBasis: 'CONSENT_WITH_NOTICE',
    legalBasisExplanation: `People opted in through event forms for the ${titoEvent.title}`,
  };

  try {
    const updateLegalsEvent = await fetch('https://api.hubapi.com/communication-preferences/v3/subscribe', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(legalEventsBody),
    });
    const responseUpdateLegals = await updateLegalsEvent.json();

    if (user.opt_ins.length > 0) {
      const otpMarkeing = user.opt_ins.filter((item) => item.id == '490')[0];
      console.log('[MARKETING] Is subscribed? ', JSON.stringify(otpMarkeing));

      if (otpMarkeing && otpMarkeing.opted_in === true) {
        const updateLegalsMkt = await fetch('https://api.hubapi.com/communication-preferences/v3/subscribe', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AUTH}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(legalMktBody),
        });
        const responseUpdateLegalsMkt = await updateLegalsMkt.json();
      }
    }
  } catch (e) {
    console.log(e);
  }
  console.log(`${userId} created`);
  return userId;
};

// Utils
function getRoleMapping(roleRaw) {
  const role = roleRaw.trim();
  switch (role) {
    case 'Chair':
      return 115;
    case 'Secretary General':
      return 117;
    case 'Elected Official':
      return 119;
    case 'International Secretary':
      return 121;
    case 'Delegate':
      return 123;
    case 'Treasurer':
      return 125;
    case 'Staff or volunteer':
      return 127;
    default:
      return 129;
  }
}
