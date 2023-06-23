#include <node_api.h>
#include <iostream>
#include <fstream>
#include <string>

namespace simple_native{


    napi_value RunMethod(napi_env env, napi_callback_info args){
        napi_status status;
        napi_value lib_name; 

        status = napi_create_string_utf8(env, "<<SIMPLE_NATIVE_ID>>", NAPI_AUTO_LENGTH, &lib_name);
        if (status != napi_ok){
            return nullptr;
        }

        return lib_name;
    }

    napi_value init(napi_env env, napi_value exports){
        napi_status status;
        napi_value fn;

        status = napi_create_function(env, nullptr, 0, RunMethod, nullptr, &fn);
        if (status != napi_ok) {
            return nullptr;
        }

        status = napi_set_named_property(env, exports, "GetName", fn);
        if (status != napi_ok) {
            return nullptr;
        }

        return exports;
    }

    NAPI_MODULE(NODE_GYP_MODULE_NAME, init)

}