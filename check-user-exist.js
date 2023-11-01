exports.checkUserExist = async (user) => {
  const searchContact = await fetch(`https://api.hubapi.com/contacts/v1/contact/email/${user.email}/profile`, {
    headers: {
      Authorization: `Bearer ${process.env.AUTH}`,
      'Content-Type': 'application/json',
    },
  });

  const responseSearchContact = await searchContact.json();
  if (responseSearchContact.status == 'error') {
    // console.log('user not exist')
    return 'error';
  } else {
    // console.log('user exist')
    return responseSearchContact.vid;
  }
};
