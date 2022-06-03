import json
import requests
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

URL=os.environ["ES_URL"]
headers = {'Authorization': os.environ["ES_AUTHORIZATION"],'content-type': 'application/json'}

## Method to get ENTITY_HASH and TABLE_NAME based on AGGREGATE_ID
def get_docs(es_query_payload):
        url = URL+"encounter/_search/"
            ## Filter ES Query
                payload = json.dumps(es_query_payload)
                    
                        ## Use python request module to send post request to ES.
                            response = requests.post(url, headers=headers, data=payload)

                                ## Convert ES response into text
                                    return (response.text)
                                    
                                def get_patient_docs(es_query_payload):
                                        
                                        
                                        url = URL+"patient_demographics/_search/"
                                            ## Filter ES Query
                                                payload = json.dumps(es_query_payload)
                                                    
                                                        ## Use python request module to send post request to ES.
                                                            response = requests.post(url, headers=headers, data=payload)

                                                                ## Convert ES response into text
                                                                    return (response.text)
