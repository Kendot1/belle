Pod::Spec.new do |s|
  s.name           = 'LocalAI'
  s.version        = '1.0.0'
  s.summary        = 'On-device Apple Foundation Models bridge for Quiet Notes.'
  s.description    = 'A narrow Expo module for local text generation and availability checks.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Quiet Notes'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platform       = :ios, '16.4'
  s.swift_version  = '6.0'
  s.source         = { :git => 'https://github.com/expo/expo.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
