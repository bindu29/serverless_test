'use strict';
const chromium = require('chrome-aws-lambda');
const axios = require('axios');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const _validateToken = (headers) => {
    const token = headers.authorization
    return axios({
        method: 'get',
        baseURL: process.env.AUTH_API_ENDPOINT,
        url: '/lockscreen/verifyToken',
        headers: {
            'authorization': token
        },
        validateStatus: function (status) {
            // It will reject the promise if response status is not 200
            return status == 200;
        }
    }).then((res) => {
        return true
    }).catch((error) => {
        return false
    })
}

module.exports.pdf = async (event, context, callback) => {

    const isTokenValid = await _validateToken(event.headers)

    // Return 401 error message if authorization token is not present or valid
    if (!isTokenValid) {
        const response = {
            statusCode: 401,
            body: JSON.stringify(
                {
                    statusCode: 401,
                    message: 'You have attempted to access a page for which you are not authorized.',
                },
                null,
                2
            ),
        }
        return callback(null, response)
    }


  let result = null;
  let browser = null;
  let externalHtmlCode = null;

    if (event.body) {
        externalHtmlCode = decodeURIComponent(event.body)
        if (externalHtmlCode) {
            externalHtmlCode = externalHtmlCode.slice(1, -1)
        }
    }
  const html = `
    <html>
      <head>
      <link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900" rel="stylesheet" type="text/css">
      <link href="https://use.fontawesome.com/releases/v5.0.13/css/all.css" rel="stylesheet" type="text/css">
      <link href="https://cdn.jsdelivr.net/npm/quasar@1.19.0/dist/quasar.min.css" rel="stylesheet" type="text/css">
      </head>
        <style type="text/css">
          thead {
            display: table - header - group;
            break-inside: avoid;
          }
          @media print {
            .myDiv {
              break-inside: avoid;
            }
          }
          @page {
            size: 'A4';
            margin: 0;
          }
        </style>
        <body>
          <div class="myDiv">
            ${ externalHtmlCode }
          </div>
          <script src="https://cdn.jsdelivr.net/npm/vue@^2.0.0/dist/vue.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/quasar@1.19.0/dist/quasar.umd.min.js"></script>
      </body>
    </html>
  `;


  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();

    await page.setContent(html, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    })

    const timestamp = Date.now();
    const randomNumber = Math.ceil(Math.random() * 10000000000)
    const output_filename = `${timestamp}-${randomNumber}.pdf`

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: output_filename,
        Body: pdf,
        ContentType: 'application/pdf'
    }

    await s3.putObject(s3Params).promise()

    const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: output_filename,
        Expires: 60 * 5,
        ResponseContentDisposition: `attachment; filename=${output_filename}`,
    });

    result = {
      headers: {
        'Content-type': 'application/json'
      },
      statusCode: 200,
      body: JSON.stringify({ pdfUrl: url })
    };
  } catch (error) {
    console.log('error :::: ', error)
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return callback(null, result);
};
