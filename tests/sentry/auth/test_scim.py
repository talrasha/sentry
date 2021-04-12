from sentry.testutils import APITestCase

CREATE_USER_POST_DATA = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "test.user@okta.local",
    "name": {"givenName": "Test", "familyName": "User"},
    "emails": [{"primary": True, "value": "test.user@okta.local", "type": "work"}],
    "displayName": "Test User",
    "locale": "en-US",
    "externalId": "00ujl29u0le5T6Aj10h7",
    "groups": [],
    "password": "1mz050nq",
    "active": True,
}


class SCIMUserTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.login_as(user=self.user)

    def test_create_user(self):
        response = self.client.get(
            f"/scim/{self.organization.slug}/scim/v2/Users?filter=userName%20eq%20%22test.user%40okta.local%22&startIndex=1&count=100"
        )
        correct_get_data = {
            "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            "totalResults": 0,
            "startIndex": 1,
            "itemsPerPage": 0,
            "Resources": [],
        }
        assert correct_get_data == response.data

        response = self.client.post(
            f"/scim/{self.organization.slug}/scim/v2/Users", CREATE_USER_POST_DATA
        )

        correct_post_data = {
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
            "id": "23a35c27-23d3-4c03-b4c5-6443c09e7173",
            "userName": "test.user@okta.local",
            "name": {"givenName": "Test", "familyName": "User"},
            "emails": [{"primary": True, "value": "test.user@okta.local", "type": "work"}],
            "displayName": "Test User",
            "locale": "en-US",
            "externalId": "00ujl29u0le5T6Aj10h7",
            "active": True,
            "groups": [],
            "meta": {"resourceType": "User"},
        }

        assert correct_post_data == response.data


# {
#   "trigger_url": "https://api.runscope.com/radar/542c3c9f-2fd0-4272-8869-3e7222ce9b01/trigger",
#   "name": "Okta SCIM 2.0 SPEC Test",
#   "version": "1.0",
#   "exported_at": 1502143364,
#   "steps": [
#     {
#       "url": "{{SCIMBaseURL}}/Users?count=1&startIndex=1",
#       "variables": [
#         {
#           "source": "response_json",
#           "property": "Resources[0].id",
#           "name": "ISVUserid"
#         }
#       ],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Test Users endpoint",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "has_value",
#           "property": "schemas",
#           "value": "urn:ietf:params:scim:api:messages:2.0:ListResponse",
#           "source": "response_json"
#         },
#         {
#           "comparison": "is_a_number",
#           "property": "itemsPerPage",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "is_a_number",
#           "property": "startIndex",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "is_a_number",
#           "property": "totalResults",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources[0].id",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources[0].name.familyName",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources[0].name.givenName",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources[0].userName",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources[0].active",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "Resources[0].emails[0].value",
#           "value": null,
#           "source": "response_json"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Users/{{ISVUserid}}",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Get Users/{{id}} ",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "id",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "name.familyName",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "name.givenName",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "userName",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "active",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "emails[0].value",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "id",
#           "value": "{{ISVUserid}}",
#           "source": "response_json"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Users?filter=userName eq \"{{InvalidUserEmail}}\"",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Test invalid User by username",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         },
#         {
#           "comparison": "has_value",
#           "property": "schemas",
#           "value": "urn:ietf:params:scim:api:messages:2.0:ListResponse",
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "totalResults",
#           "value": "0",
#           "source": "response_json"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Users/{{UserIdThatDoesNotExist}}",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Test invalid User by ID",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "404",
#           "source": "response_status"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "detail",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "has_value",
#           "property": "schemas",
#           "value": "urn:ietf:params:scim:api:messages:2.0:Error",
#           "source": "response_json"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Users?filter=userName eq \"{{randomEmail}}\"",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Make sure random user doesn't exist",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         },
#         {
#           "comparison": "equal_number",
#           "property": "totalResults",
#           "value": "0",
#           "source": "response_json"
#         },
#         {
#           "comparison": "has_value",
#           "property": "schemas",
#           "value": "urn:ietf:params:scim:api:messages:2.0:ListResponse",
#           "source": "response_json"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "body": "{\"schemas\":[\"urn:ietf:params:scim:schemas:core:2.0:User\"],\"userName\":\"{{randomUsername}}\",\"name\":{\"givenName\":\"{{randomGivenName}}\",\"familyName\":\"{{randomFamilyName}}\"},\"emails\":[{\"primary\":true,\"value\":\"{{randomEmail}}\",\"type\":\"work\"}],\"displayName\":\"{{randomGivenName}} {{randomFamilyName}}\",\"active\":true}",
#       "form": {},
#       "url": "{{SCIMBaseURL}}/Users",
#       "variables": [
#         {
#           "source": "response_json",
#           "property": "id",
#           "name": "idUserOne"
#         },
#         {
#           "source": "response_json",
#           "property": "emails[0].value",
#           "name": "randomUserEmail"
#         }
#       ],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Create Okta user with realistic values",
#       "headers": {
#         "Content-Type": [
#           "application/json"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "Accept": [
#           "application/scim+json; charset=utf-8"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "201",
#           "source": "response_status"
#         },
#         {
#           "comparison": "equal",
#           "property": "active",
#           "value": "true",
#           "source": "response_json"
#         },
#         {
#           "comparison": "not_empty",
#           "property": "id",
#           "value": null,
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "name.familyName",
#           "value": "{{randomFamilyName}}",
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "name.givenName",
#           "value": "{{randomGivenName}}",
#           "source": "response_json"
#         },
#         {
#           "comparison": "contains",
#           "property": "schemas",
#           "value": "urn:ietf:params:scim:schemas:core:2.0:User",
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "userName",
#           "value": "{{randomUsername}}",
#           "source": "response_json"
#         }
#       ],
#       "scripts": [
#         ""
#       ],
#       "before_scripts": [],
#       "method": "POST"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Users/{{idUserOne}}",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Verify that user was created",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         },
#         {
#           "comparison": "equal",
#           "property": "userName",
#           "value": "{{randomUsername}}",
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "name.familyName",
#           "value": "{{randomFamilyName}}",
#           "source": "response_json"
#         },
#         {
#           "comparison": "equal",
#           "property": "name.givenName",
#           "value": "{{randomGivenName}}",
#           "source": "response_json"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 10,
#       "step_type": "pause"
#     },
#     {
#       "body": "{\"schemas\":[\"urn:ietf:params:scim:schemas:core:2.0:User\"],\"userName\":\"{{randomUsername}}\",\"name\":{\"givenName\":\"{{randomGivenName}}\",\"familyName\":\"{{randomFamilyName}}\"},\"emails\":[{\"primary\":true,\"value\":\"{{randomUsername}}\",\"type\":\"work\"}],\"displayName\":\"{{randomGivenName}} {{randomFamilyName}}\",\"active\":true}",
#       "form": {},
#       "url": "{{SCIMBaseURL}}/Users",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Expect failure when recreating user with same values",
#       "headers": {
#         "Content-Type": [
#           "application/json"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "Accept": [
#           "application/scim+json; charset=utf-8"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "409",
#           "source": "response_status"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "POST"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Users?filter=userName eq \"{{randomUsernameCaps}}\"",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Required Test: Username Case Sensitivity Check",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         }
#       ],
#       "scripts": [],
#       "before_scripts": [],
#       "method": "GET"
#     },
#     {
#       "duration": 5,
#       "step_type": "pause"
#     },
#     {
#       "url": "{{SCIMBaseURL}}/Groups",
#       "variables": [],
#       "multipart_form": [],
#       "step_type": "request",
#       "auth": {},
#       "note": "Optional Test: Verify Groups endpoint",
#       "headers": {
#         "Accept-Charset": [
#           "utf-8"
#         ],
#         "Content-Type": [
#           "application/scim+json; charset=utf-8"
#         ],
#         "Accept": [
#           "application/scim+json"
#         ],
#         "Authorization": [
#           "{{auth}}"
#         ],
#         "User-Agent": [
#           "OKTA SCIM Integration"
#         ]
#       },
#       "assertions": [
#         {
#           "comparison": "equal_number",
#           "value": "200",
#           "source": "response_status"
#         },
#         {
#           "comparison": "is_less_than",
#           "value": "600",
#           "source": "response_time"
#         }
#       ],
#       "scripts": [
#         "var data = JSON.parse(response.body);\nvar max = data.totalResults;\nvar res = data.Resources;\nvar exists = false;\n\nif (max === 0)\n\tassert(\"nogroups\", \"No Groups found in the endpoint\");\nelse if (max >= 1 && Array.isArray(res)) {\n    exists = true;\n    assert.ok(exists, \"Resources is of type Array\");\n\tlog(exists);\n}"
#       ],
#       "before_scripts": [],
#       "method": "GET"
#     }
#   ],
#   "description": "Basic tests to see if your SCIM server will work with Okta"
# }
